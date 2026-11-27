// What plays and how: the adaptive (HLS) or plain MP4 source, each person's own subtitles,
// and the subtitles / audio / quality menu.
import { $, el, video, api, setStatus, prettyTitle } from './ui.js';
import { S } from './state.js';

// ---- Adaptive playback ----
// Films with an adaptive version play through hls.js (loaded on first use), which picks the
// quality to suit the connection. Everything else, and anything that fails, uses the MP4.
/** @type {any} */
let hls = null;
let hlsLoader = null;
/** @type {{ subtitles: {id: string, label: string, url: string}[], adaptive?: boolean, hlsUrl?: string }} */
let mediaInfo = { subtitles: [] };

// hls.js is a classic script that sets window.Hls.
const win = /** @type {any} */ (window);

function loadHlsLib() {
  if (win.Hls) return Promise.resolve(win.Hls);
  hlsLoader ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/vendor/hls.min.js';
    script.onload = () => resolve(win.Hls);
    script.onerror = () => {
      hlsLoader = null;
      reject(new Error('hls.js failed to load'));
    };
    document.head.append(script);
  });
  return hlsLoader;
}

export async function attachSource(name) {
  if (hls) {
    hls.destroy();
    hls = null;
  }
  clearSubtitleTrack();
  mediaInfo = { subtitles: [] };
  let info = null;
  try {
    info = await api('GET', `/api/library/${encodeURIComponent(name)}/info`);
  } catch {}
  // Another film may have been loaded while we waited.
  if (name !== S.currentSrc) return;
  mediaInfo = info || { subtitles: [] };
  const direct = `demo-files/films/${encodeURIComponent(name)}`;
  if (info?.adaptive) {
    try {
      const Hls = await loadHlsLib();
      if (name !== S.currentSrc) return;
      if (Hls.isSupported()) {
        // 60 s ahead instead of hls.js's 30: a longer cushion rides out a dropped connection.
        hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 60 });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          console.warn('adaptive stream failed', data);
          hls.destroy();
          hls = null;
          video.src = direct;
          setStatus('The adaptive stream failed, so this is playing the regular file');
        });
        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, restoreAudioChoice);
        hls.loadSource(info.hlsUrl);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = info.hlsUrl; // Safari plays HLS natively
      } else {
        video.src = direct;
      }
    } catch {
      video.src = direct;
    }
  } else {
    video.src = direct;
  }
  restoreSubtitleChoice();
}

/**
 * Restart a download that has stopped delivering data. The sync loop then seeks back to the room.
 * @returns {boolean} whether the element itself was reset (it fires `pause`, then `loadedmetadata`)
 */
export function reloadSource() {
  if (hls) {
    hls.stopLoad();
    hls.startLoad(video.currentTime);
    return false;
  }
  const src = video.getAttribute('src');
  if (!src) return false;
  // Assigning the same URL is enough: the element drops the old request and opens a new one.
  video.src = src;
  return true;
}

// ---- Subtitles ----
// Each person picks their own; cues are drawn in our own box so they sit above the controls.
let subTrackEl = null;
let subChoice = null;
let subTarget = null;

export const subtitlesOn = () => !!subChoice;

function clearSubtitleTrack() {
  subTrackEl?.remove();
  subTrackEl = null;
  subChoice = null;
  $('subs').replaceChildren();
}

function chooseSubtitle(id) {
  clearSubtitleTrack();
  try {
    localStorage.setItem(`wt-sub:${S.currentSrc}`, id || '');
  } catch {}
  const t = mediaInfo.subtitles.find((x) => x.id === id);
  if (!t) return;
  subChoice = id;
  const track = document.createElement('track');
  track.kind = 'subtitles';
  track.label = t.label;
  track.src = t.url;
  video.append(track);
  subTrackEl = track;
  track.track.mode = 'hidden';
  track.track.addEventListener('cuechange', () => {
    const box = $('subs');
    box.replaceChildren();
    for (const cue of /** @type {any} */ (track.track.activeCues) || []) {
      const line = el('div', 'cue');
      line.append(cue.getCueAsHTML());
      box.append(line);
    }
  });
}

function restoreSubtitleChoice() {
  let id = null;
  try {
    id = localStorage.getItem(`wt-sub:${S.currentSrc}`);
  } catch {}
  if (id && mediaInfo.subtitles.some((t) => t.id === id)) chooseSubtitle(id);
}

export function pickSubtitleFile(name) {
  subTarget = name;
  $('subInput').click();
}

$('subInput').onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  const name = subTarget || S.currentSrc;
  subTarget = null;
  if (!file || !name) return;
  try {
    const res = await fetch(`/api/subtitles/${encodeURIComponent(name)}`, { method: 'PUT', headers: { 'x-filename': file.name }, body: file });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    setStatus(`Added subtitles "${data.label}" to ${prettyTitle(name)}`);
    if (name === S.currentSrc) {
      mediaInfo = await api('GET', `/api/library/${encodeURIComponent(name)}/info`);
      chooseSubtitle(data.id);
      renderTrackMenu();
    }
  } catch (err) {
    setStatus(`Couldn't add subtitles: ${err.message}`);
  }
};

// ---- Subtitles / audio / quality menu ----
const LANGS = { eng: 'en', hin: 'hi', spa: 'es', fra: 'fr', fre: 'fr', deu: 'de', ger: 'de', ita: 'it', por: 'pt', rus: 'ru', jpn: 'ja', kor: 'ko', zho: 'zh', chi: 'zh', tam: 'ta', tel: 'te', mal: 'ml', kan: 'kn', ben: 'bn', mar: 'mr', urd: 'ur', ara: 'ar', tur: 'tr', nld: 'nl', dut: 'nl' };
function langName(code) {
  if (!code || code === 'und') return null;
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(LANGS[code] || code);
  } catch {
    return code;
  }
}

function restoreAudioChoice() {
  let lang = null;
  try {
    lang = localStorage.getItem('wt-audio-lang');
  } catch {}
  const i = hls?.audioTracks.findIndex((a) => a.lang === lang) ?? -1;
  if (i >= 0 && hls.audioTrack !== i) hls.audioTrack = i;
}

function renderTrackMenu() {
  const menu = $('trackMenu');
  if (menu.hidden) return;
  menu.replaceChildren();
  const title = (text) => menu.append(el('div', 'menu-title', text));
  const item = (label, selected, choose) => {
    const b = el('button', `menu-item${selected ? ' on' : ''}`, label);
    b.type = 'button';
    b.setAttribute('role', 'menuitemradio');
    b.setAttribute('aria-checked', String(!!selected));
    b.onclick = () => {
      choose();
      renderTrackMenu();
    };
    menu.append(b);
  };
  title('Subtitles');
  item('Off', !subChoice, () => chooseSubtitle(null));
  for (const t of mediaInfo.subtitles) item(t.label, subChoice === t.id, () => chooseSubtitle(t.id));
  const add = el('button', 'menu-item add', '+ Add subtitles (.srt or .vtt)');
  add.type = 'button';
  add.onclick = () => pickSubtitleFile(S.currentSrc);
  menu.append(add);
  if (hls && hls.audioTracks.length > 1) {
    title('Audio');
    hls.audioTracks.forEach((a, i) =>
      item(langName(a.lang) || a.name || `Track ${i + 1}`, hls.audioTrack === i, () => {
        hls.audioTrack = i;
        try {
          localStorage.setItem('wt-audio-lang', a.lang || '');
        } catch {}
      })
    );
  }
  if (hls && hls.levels.length > 1) {
    title('Quality');
    item('Auto', hls.autoLevelEnabled, () => (hls.currentLevel = -1));
    hls.levels.forEach((l, i) => item(`${l.height}p`, !hls.autoLevelEnabled && hls.currentLevel === i, () => (hls.currentLevel = i)));
  }
}

$('trackBtn').onclick = (e) => {
  e.stopPropagation();
  const menu = $('trackMenu');
  menu.hidden = !menu.hidden;
  renderTrackMenu();
};
document.addEventListener('click', (e) => {
  if (!$('trackMenu').hidden && !(/** @type {Element} */ (e.target)).closest?.('#trackMenu, #trackBtn')) $('trackMenu').hidden = true;
});
