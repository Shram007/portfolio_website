// The player: the 500 ms sync loop, clock offset, what the <video> events mean, and our own
// control bar, volume, click/tap gestures and keyboard shortcuts.
//
// Sync model: the server holds the room's anchor (src, paused, stalled, position); the loop
// steers the local player toward it. Events only report user intent.
import { computeCorrection, bufferedAhead, bufferedTotal, targetPosition, updateClock, nextCatchUpLead, shortOfData, RESUME_AHEAD, CATCH_UP_LEAD } from './sync.js';
import { $, video, setStatus, setIcon, fmtTime } from './ui.js';
import { S, send, locked, deny } from './state.js';
import { attachSource, reloadSource, subtitlesOn } from './tracks.js';
import { openLibrary, renderFiles, updateNowShowing } from './library.js';
import { toggleFullscreen, wake } from './stage.js';

const SYNC_INTERVAL_MS = 500;
// Each corrective seek throws away the buffer; unlimited seeks turn a hiccup into a permanent stall.
const HARD_SEEK_MIN_INTERVAL_MS = 3000;
// While frozen a jump is invisible, so align much tighter than during playback.
const FROZEN_TOLERANCE = 0.1;
// Matches the server's START_DELAY_MS; only used until its state arrives.
const LOCAL_START_DELAY_MS = 400;
// Waiting with no new data for this long means the request has died, not that it's slow.
// Browsers can sit on a dead MP4 request forever without firing an error.
const STUCK_MS = 8000;
const RELOAD_MIN_INTERVAL_MS = 20_000;
// Watched below this much loaded ahead, not only once short of data, so a dropped request is
// restarted while the cushion still covers it and nobody sees a freeze.
const WATCH_AHEAD = 30;

// Estimated (server clock - local clock), in ms, from ping round trips.
let clockOffset = null;
const clockSamples = [];
const serverNow = () => Date.now() + (clockOffset ?? 0);
let startTimer = null;
// What we last told the server about our buffer.
let starved = false;
let lastHardSeek = 0;
// Position of our own most recent programmatic seek, so its `seeked` event isn't taken for the user's.
let expectSeekTo = null;
// Set while we hold ahead of a running room for it to arrive (see the catch-up in syncTick).
/** @type {{ to: number } | null} */
let catchUp = null;
let catchUpLead = CATCH_UP_LEAD;
let catchUpEndedAt = -Infinity;
// Download progress while waiting for data, to spot a dead request.
/** @type {{ total: number, at: number } | null} */
let progress = null;
let lastReload = -Infinity;
// A reload resets the element, which fires `pause`; that isn't the user's.
let reloading = false;

/** A pong: one more round-trip sample for the clock offset estimate. */
export function onPong(msg) {
  const now = Date.now();
  const rtt = now - msg.t;
  clockOffset = updateClock(clockSamples, clockOffset, { rtt, offset: msg.serverNow + rtt / 2 - now });
}

/** A new socket: it isn't in the server's buffering set (the loop re-reports if needed), and old clock samples may be stale. */
export function resetSync() {
  starved = false;
  catchUp = null;
  clockSamples.length = 0;
}

/** A state or tick from the server. `explicit` is a real change, not a heartbeat. */
export function onState(state, explicit, msgServerNow) {
  // Rough until the first pong: ignores latency, but far better than assuming equal clocks.
  if (clockOffset === null) clockOffset = msgServerNow - Date.now();
  S.roomState = state;
  // A future anchor is a scheduled start: hit it on time rather than on the next loop tick.
  clearTimeout(startTimer);
  const wait = state.updatedAt - serverNow();
  if (!state.paused && !state.stalled && wait > 0) startTimer = setTimeout(syncTick, wait + 2);
  // A new command from the room may correct immediately; the seek limit only slows the drift loop.
  // It also moves the target, so any catch-up hold is aimed at the wrong place.
  if (explicit) {
    lastHardSeek = 0;
    catchUp = null;
  }
  if (state.src && state.src !== S.currentSrc) {
    S.currentSrc = state.src;
    attachSource(state.src);
    updateNowShowing();
    renderFiles();
  }
  $('emptyStage').hidden = !!state.src;
  $('controls').hidden = !state.src;
}

// Optimistic local update for our own action, so the loop doesn't undo it before the server echoes.
function localIntent(change) {
  if (!S.roomState) return;
  const next = { ...S.roomState, ...change, stalled: false };
  S.roomState = { ...next, updatedAt: serverNow() + (next.paused ? 0 : LOCAL_START_DELAY_MS) };
}

// Waiting for a scheduled start: running in intent, but holding at the anchor.
function inCountdown() {
  const rs = S.roomState;
  return !!rs && !rs.paused && !rs.stalled && serverNow() < rs.updatedAt;
}

/** @returns {boolean} whether the seek happened (not rate-limited) */
function hardSeek(to) {
  if (Date.now() - lastHardSeek < HARD_SEEK_MIN_INTERVAL_MS) return false;
  lastHardSeek = Date.now();
  expectSeekTo = to;
  video.currentTime = to;
  return true;
}

// Data that should be arriving isn't: start the download again from where we are.
function watchForStuckDownload(rs, starvedNow) {
  const ahead = bufferedAhead(video.buffered, video.currentTime);
  const loadedToEnd = Number.isFinite(video.duration) && video.currentTime + ahead >= video.duration - 0.5;
  if (rs.paused || loadedToEnd || !(starvedNow || ahead < WATCH_AHEAD)) {
    progress = null;
    return;
  }
  const total = bufferedTotal(video.buffered);
  const now = Date.now();
  if (!progress || total > progress.total + 0.01) {
    progress = { total, at: now };
    return;
  }
  if (now - progress.at < STUCK_MS || now - lastReload < RELOAD_MIN_INTERVAL_MS) return;
  lastReload = now;
  progress = null;
  catchUp = null;
  console.warn(`no video data for ${STUCK_MS / 1000} s: reloading the source`);
  reloading = reloadSource();
}

function syncTick() {
  const rs = S.roomState;
  if (!rs?.src || rs.src !== S.currentSrc) return;
  const target = targetPosition(rs, serverNow());
  const running = !rs.paused && !rs.stalled && !inCountdown();

  // Computed rather than event-driven: `waiting` never fires on a paused video, so a
  // frozen room could wait on us forever. Near the end there is never a full cushion left.
  // During a catch-up, what matters is the data where we'll start, not where the room is now.
  const at = catchUp ? catchUp.to : target;
  const nearEnd = Number.isFinite(video.duration) && at >= video.duration - RESUME_AHEAD;
  const nowStarved =
    !video.error && !nearEnd && (video.readyState < HTMLMediaElement.HAVE_METADATA || shortOfData(bufferedAhead(video.buffered, at), starved));
  if (nowStarved !== starved) {
    starved = nowStarved;
    send({ type: 'buffering', value: starved });
  }
  watchForStuckDownload(rs, nowStarved);

  // Leave the player alone while it loads or while the user drags the seek bar.
  if (video.readyState < HTMLMediaElement.HAVE_METADATA || video.seeking) return;

  if (!running) {
    catchUp = null;
    if (!video.paused) video.pause();
    video.playbackRate = 1;
    if (Math.abs(video.currentTime - target) > FROZEN_TOLERANCE) hardSeek(target);
    return;
  }

  // At the end, let the film finish: play() on an ended video restarts it from 0.
  if (Number.isFinite(video.duration) && target >= video.duration - 0.1) return;

  // Holding ahead for the room to reach us. Once it does, play: the drift loop takes over.
  if (catchUp) {
    if (target < catchUp.to) {
      if (!video.paused) video.pause();
      return;
    }
    catchUp = null;
    catchUpEndedAt = Date.now();
  }

  if (video.paused) {
    video.play().catch((err) => {
      if (err.name === 'NotAllowedError') setStatus('Click the video to allow playback');
    });
  }
  const c = computeCorrection(target, video.currentTime, video.playbackRate !== 1);
  if (c.kind === 'seek') {
    video.playbackRate = 1;
    if (c.to < video.currentTime) {
      hardSeek(c.to);
      return;
    }
    // Behind a running room (it stopped waiting for us). Seeking to where it is now would land
    // us behind again by the time that part loads, and each seek throws the buffer away. So jump
    // past it and hold; if that still wasn't far enough, the next jump goes twice as far.
    const lead = nextCatchUpLead(catchUpLead, Date.now() - catchUpEndedAt);
    const to = Number.isFinite(video.duration) ? Math.min(target + lead, video.duration - 1) : target + lead;
    if (hardSeek(to)) {
      catchUpLead = lead;
      catchUp = { to };
      video.pause();
    }
  } else {
    video.playbackRate = c.kind === 'rate' ? c.rate : 1;
  }
}
setInterval(syncTick, SYNC_INTERVAL_MS);

// The sync loop also plays, pauses and seeks the player, so only report changes that
// disagree with the room: those can only have come from the user.
video.addEventListener('play', () => {
  if (!S.roomState?.paused) return;
  if (locked()) return deny();
  localIntent({ paused: false, position: video.currentTime });
  // Hold here for the scheduled start, so the one who pressed play doesn't get a head start.
  video.pause();
  send({ type: 'play', position: video.currentTime });
});
video.addEventListener('pause', () => {
  const rs = S.roomState;
  // Ours, not the user's: the loop holding for a catch-up, or the reset of a source reload.
  if (!rs || rs.paused || rs.stalled || video.ended || inCountdown() || catchUp || reloading) return;
  if (locked()) return deny();
  localIntent({ paused: true, position: video.currentTime });
  send({ type: 'pause', position: video.currentTime });
});
// The loop's only seeks go through hardSeek(), so any other seek is the user's.
video.addEventListener('seeked', () => {
  if (!S.roomState) return;
  if (expectSeekTo !== null && Math.abs(video.currentTime - expectSeekTo) < 0.5) {
    expectSeekTo = null;
    return;
  }
  if (locked()) {
    deny();
    lastHardSeek = 0;
    return hardSeek(targetPosition(S.roomState, serverNow()));
  }
  localIntent({ position: video.currentTime });
  send({ type: 'seek', position: video.currentTime });
});
// Film over: freeze the room at the end so pressing play again starts a fresh, shared replay.
video.addEventListener('ended', () => {
  if (!S.roomState || S.roomState.paused) return;
  // With something up next, ask the room to move on (allowed even in a locked room).
  if (S.queue.length) return send({ type: 'ended', src: S.currentSrc });
  if (locked()) return;
  localIntent({ paused: true, position: video.duration });
  send({ type: 'pause', position: video.duration });
});

// Audio-only decode (width 0) means the video codec isn't supported here, typically HEVC/x265.
video.addEventListener('loadedmetadata', () => {
  reloading = false;
  if (video.videoWidth === 0) {
    setStatus("Your browser can't decode this video's codec (likely HEVC/x265). Convert to H.264.");
  }
});

// ---- Player controls ----
// Our own bar replaces the browser's, so it can have ±10 s, a heart scrubber and a fullscreen
// that keeps the call visible. Buttons express intent to the room; the sync loop moves the video.
function togglePlay() {
  if (!S.roomState?.src) return openLibrary();
  if (locked()) return deny();
  const paused = !S.roomState.paused;
  localIntent({ paused, position: video.currentTime });
  send({ type: paused ? 'pause' : 'play', position: video.currentTime });
  wake();
}

let flashTimer = null;
function flash(text, side) {
  const f = $('skipFlash');
  f.textContent = text;
  f.style.left = side === 'left' ? '12%' : 'auto';
  f.style.right = side === 'right' ? '12%' : 'auto';
  f.classList.add('show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => f.classList.remove('show'), 600);
}

function skip(delta) {
  if (!S.roomState?.src || !Number.isFinite(video.duration)) return;
  if (locked()) return deny();
  // The `seeked` handler turns this into a room-wide seek, so it lands for both of you.
  video.currentTime = Math.min(Math.max(0, video.currentTime + delta), Math.max(0, video.duration - 0.5));
  flash(delta > 0 ? '+10 s' : '−10 s', delta > 0 ? 'right' : 'left');
  wake();
}

$('playBtn').onclick = togglePlay;
$('backBtn').onclick = () => skip(-10);
$('fwdBtn').onclick = () => skip(10);

// Seek bar: an invisible range input on top of the drawn track and heart knob.
const seek = $('seek');
let seekDragging = false;
function seekTime(fraction) {
  return Number.isFinite(video.duration) ? fraction * video.duration : 0;
}
seek.addEventListener('input', () => {
  seekDragging = true;
  showSeekTip(seek.value / 1000);
});
seek.addEventListener('change', () => {
  seekDragging = false;
  $('seekTip').hidden = true;
  if (locked()) return deny();
  if (Number.isFinite(video.duration)) video.currentTime = seekTime(seek.value / 1000);
});
function showSeekTip(fraction) {
  const tip = $('seekTip');
  tip.hidden = !Number.isFinite(video.duration);
  tip.style.left = `${fraction * 100}%`;
  tip.textContent = fmtTime(seekTime(fraction));
}
$('seekWrap').addEventListener('pointermove', (e) => {
  const r = $('seekWrap').getBoundingClientRect();
  showSeekTip(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
});
$('seekWrap').addEventListener('pointerleave', () => {
  if (!seekDragging) $('seekTip').hidden = true;
});

function updateControls() {
  const d = video.duration;
  const ok = Number.isFinite(d) && d > 0;
  const t = seekDragging ? seekTime(seek.value / 1000) : video.currentTime;
  const pct = ok ? (t / d) * 100 : 0;
  $('timeCur').textContent = fmtTime(ok ? t : 0);
  $('timeTotal').textContent = fmtTime(ok ? d : 0);
  $('seekPlayed').style.width = `${pct}%`;
  $('seekKnob').style.left = `${pct}%`;
  if (!seekDragging) seek.value = Math.round(pct * 10);
  const loadedTo = ok ? video.currentTime + bufferedAhead(video.buffered, video.currentTime) : 0;
  $('seekBuffered').style.width = `${ok ? Math.min(100, (loadedTo / d) * 100) : 0}%`;
  const playing = !!S.roomState && !S.roomState.paused;
  setIcon($('playBtn'), playing ? '#i-pause' : '#i-play');
  $('playBtn').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  $('playBtn').title = playing ? 'Pause (space)' : 'Play (space)';
  $('readyBtn').hidden = playing || !S.roomState?.src || S.readyActive;
  $('trackBtn').classList.toggle('on', subtitlesOn());
}
setInterval(updateControls, 250);

// Movie volume is separate from the call and remembered per browser.
const vol = $('vol');
try {
  const v = localStorage.getItem('wt-vol');
  if (v !== null) video.volume = Math.min(1, Math.max(0, Number(v)));
  video.muted = localStorage.getItem('wt-muted') === '1';
} catch {}
function renderVolume() {
  const silent = video.muted || video.volume === 0;
  setIcon($('muteBtn'), silent ? '#i-mute' : '#i-vol');
  $('muteBtn').setAttribute('aria-label', silent ? 'Unmute' : 'Mute');
  vol.value = video.muted ? 0 : video.volume;
  try {
    localStorage.setItem('wt-vol', String(video.volume));
    localStorage.setItem('wt-muted', video.muted ? '1' : '0');
  } catch {}
}
vol.addEventListener('input', () => {
  video.volume = Number(vol.value);
  video.muted = video.volume === 0;
  renderVolume();
});
$('muteBtn').onclick = () => {
  video.muted = !video.muted;
  if (!video.muted && video.volume === 0) video.volume = 0.5;
  renderVolume();
};
renderVolume();

// Click toggles play, double-click toggles fullscreen; on touch, double-tap the left or right
// third to skip 10 s, like YouTube.
let clickTimer = null;
let suppressClick = false;
let lastTap = { t: 0, side: 0 };
video.addEventListener('click', () => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  clearTimeout(clickTimer);
  clickTimer = setTimeout(togglePlay, 250);
});
video.addEventListener('dblclick', (e) => {
  e.preventDefault();
  clearTimeout(clickTimer);
  if (lastTap.side) return;
  toggleFullscreen();
});
video.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'touch') {
    lastTap = { t: 0, side: 0 };
    return;
  }
  const r = video.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const side = x < 0.33 ? -1 : x > 0.67 ? 1 : 0;
  const now = Date.now();
  if (side && side === lastTap.side && now - lastTap.t < 300) {
    clearTimeout(clickTimer);
    suppressClick = true;
    skip(10 * side);
    lastTap = { t: 0, side };
    return;
  }
  lastTap = { t: now, side };
});

// Keyboard: space/K play, arrows ±10 s, M mute, F fullscreen, C tracks. Ignored while typing.
document.addEventListener('keydown', (e) => {
  if ($('room').hidden || $('library').open || e.ctrlKey || e.metaKey || e.altKey) return;
  const target = /** @type {any} */ (e.target);
  if (target.closest?.('input:not([type=range]), textarea, select')) return;
  const k = e.key.toLowerCase();
  if (k === ' ' && target.closest?.('button')) return;
  if (k === ' ' || k === 'k') togglePlay();
  else if (k === 'arrowleft') skip(-10);
  else if (k === 'arrowright') skip(10);
  else if (k === 'm') $('muteBtn').click();
  else if (k === 'f') toggleFullscreen();
  else if (k === 'c') $('trackBtn').click();
  else return;
  e.preventDefault();
});
