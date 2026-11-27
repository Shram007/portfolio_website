// Demo-only touches on top of the real page, so a visitor sees what the app does without
// reading about it: a sync meter on the video, a short list of things to try, and the banner's
// "Open a second tab" and "Reset demo" buttons. Loaded after app.js; reads the page's shared
// state and never changes how the app itself behaves.
import { events, resetDemo, tabsShareServer } from './demo.js';
import { S } from '../state.js';
import { targetPosition } from '../sync.js';
import { $, el, video, stage, setStatus } from '../ui.js';

const params = new URLSearchParams(location.search);
const store = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || '') ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

// ---- Join screen: a room code to start with, and a different name in a second tab ----
if (!$('code').value) $('code').value = 'movie-night';
let ownName = null;
try {
  ownName = sessionStorage.getItem('wt-demo-name');
} catch {}
if (!ownName && params.get('tab') === '2') {
  let first = 'Guest';
  try {
    first = localStorage.getItem('wt-name') || 'Guest';
  } catch {}
  ownName = `${first} (tab 2)`.slice(0, 24);
}
if (ownName) {
  const firstTabName = (() => {
    try {
      return localStorage.getItem('wt-name');
    } catch {
      return null;
    }
  })();
  $('name').value = ownName;
  $('joinBtn').textContent = 'Join room';
  $('joinBtn').focus();
  // Runs after the app's own submit handler, which saves the name for next time: put the
  // first tab's name back, and keep this tab's name for this tab only.
  $('joinForm').addEventListener('submit', () => {
    try {
      sessionStorage.setItem('wt-demo-name', $('name').value.trim());
      if (firstTabName) localStorage.setItem('wt-name', firstTabName);
    } catch {}
  });
}

// ---- Banner buttons ----
$('demoReset').onclick = () => resetDemo();
$('demoSecondTab').onclick = () => {
  if (!tabsShareServer()) {
    setStatus("This browser keeps each tab of the demo separate here, so a second tab wouldn't sync.");
    return;
  }
  const room = S.roomCode || 'movie-night';
  const tab = window.open(`${location.pathname}?room=${encodeURIComponent(room)}&tab=2`, '_blank');
  // Some embedded previews refuse new windows.
  if (!tab) setStatus("This page can't open a new tab here. Open the demo again in another tab to try it.");
};

// ---- Sync meter ----
// How far this tab's video is from where the room says it should be right now. In the demo
// every tab shares this computer's clock, so Date.now() is the server's clock too.
const meter = el('div', 'demo-meter');
meter.hidden = true;
meter.title = "How far this tab's video is from where the room says it should be";
const meterText = el('span');
meter.append(el('span', 'dot'), meterText);
stage.append(meter);
let smooth = null;

function showMeter(kind, text) {
  meter.hidden = false;
  meter.dataset.kind = kind;
  meterText.textContent = text;
}

setInterval(() => {
  const rs = S.roomState;
  // While the room waits for someone, the page's own "Waiting for…" chip says so.
  if (!rs || !S.currentSrc || rs.stalled || video.readyState === 0 || video.ended) {
    meter.hidden = true;
    smooth = null;
    return;
  }
  if (rs.paused) return showMeter('paused', 'Paused together');
  const now = Date.now();
  if (now < rs.updatedAt) return showMeter('wait', 'Starting together…');
  const drift = video.currentTime - targetPosition(rs, now);
  smooth = smooth == null ? drift : smooth * 0.6 + drift * 0.4;
  const ms = Math.round(Math.abs(smooth) * 1000);
  if (ms < 150) showMeter('ok', `In sync, ${ms} ms off`);
  else showMeter('far', `Catching up, ${Math.abs(smooth).toFixed(1)} s ${smooth < 0 ? 'behind' : 'ahead'}`);
}, 250);

// ---- Things to try ----
const STEPS = [
  ['film', 'Pick a film from the Library'],
  ['play', 'Press play: the room waits for Sam to load'],
  ['tab', 'Open a second tab and watch both play in step'],
  ['call', 'Start a call, with drawn video and no camera'],
  ['react', 'Send a reaction'],
  ['lock', 'Lock the remote, so only you can pause'],
];
const done = new Set(store.get('wt-demo-tour', []));
const tour = el('section', 'card demo-tour');
tour.setAttribute('aria-label', 'Things to try');
const head = el('div', 'demo-tour-head');
const title = el('h2', 'serif', 'Things to try');
const count = el('span', 'count');
const toggle = el('button', 'ghost', '');
toggle.type = 'button';
head.append(title, count, toggle);
const list = el('ul');
tour.append(head, list);
$('side').insertBefore(tour, $('reactions'));

// Short windows start folded to the next step, so the chat keeps its room.
let open = store.get('wt-demo-tour-open', innerHeight >= 1000);
toggle.onclick = () => {
  open = !open;
  store.set('wt-demo-tour-open', open);
  renderTour();
};

function renderTour() {
  const next = STEPS.find(([id]) => !done.has(id));
  count.textContent = next ? `${done.size} of ${STEPS.length} done` : 'All done';
  toggle.textContent = open ? 'Fold' : 'Show all';
  toggle.setAttribute('aria-expanded', String(open));
  const shown = open ? STEPS : STEPS.filter(([id]) => next && id === next[0]);
  list.replaceChildren(
    ...shown.map(([id, text]) => {
      const li = el('li', done.has(id) ? 'done' : next?.[0] === id ? 'next' : null);
      li.append(el('span', 'tick'), el('span', null, text));
      if (done.has(id)) li.append(el('span', 'sr-only', ' (done)'));
      return li;
    })
  );
  if (!next && !open) list.replaceChildren(el('li', 'done', "That's the tour. Thanks for watching."));
}

function tick(id) {
  if (done.has(id)) return;
  done.add(id);
  store.set('wt-demo-tour', [...done]);
  renderTour();
}

events.addEventListener('sent', (/** @type {any} */ e) => {
  const msg = e.detail;
  if (msg.type === 'src') tick('film');
  if (msg.type === 'play' || msg.type === 'ready-check') tick('play');
  if (msg.type === 'reaction') tick('react');
  if (msg.type === 'control' && msg.mode === 'host') tick('lock');
});
events.addEventListener('received', (/** @type {any} */ e) => {
  const msg = e.detail;
  // Someone here who is neither this tab nor Sam: a second tab, or a second person.
  if (msg.type === 'control' && msg.people?.some((p) => !p.me && p.name !== 'Sam')) tick('tab');
});
$('callStart').addEventListener('click', () => tick('call'));
// Another tab ticked something.
addEventListener('storage', (e) => {
  if (e.key !== 'wt-demo-tour') return;
  for (const id of store.get('wt-demo-tour', [])) done.add(id);
  renderTour();
});
renderTour();
