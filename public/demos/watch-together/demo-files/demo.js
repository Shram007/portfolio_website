// The demo's pretend server. The real app talks to server.js over a WebSocket and a few HTTP
// endpoints; here both are stood in for inside the browser, so the page can be served as plain
// files. What stays real is the part worth showing: rooms.js, the room state machine, runs
// unchanged, and the page's own modules (sync loop, player, call, chat) don't know the difference.
//
// Tabs of the demo share one "server": the first tab to take a Web Lock runs it, and the others
// talk to it over a BroadcastChannel, so two tabs side by side sync the way two people would.
// If the browser can't do that (no Web Locks, or a sandboxed frame), each tab runs its own.
//
// Nothing leaves the browser: uploads are read and dropped, the call uses drawn stand-ins
// instead of the camera and mic, and the only stored data is the room and library state in
// this browser's storage (the banner's "Reset demo" clears it).
//
// This file must load before app.js: it replaces WebSocket, fetch for /api/* and getUserMedia.
import { createRooms } from './rooms.js';
import { parseClientMessage, REACTIONS } from '../protocol.js';
import { FILMS } from './films.js';

const win = /** @type {any} */ (globalThis);
const KEYS = { rooms: 'wt-demo-rooms', library: 'wt-demo-library', greeted: 'wt-demo-greeted' };
const randomId = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
const later = (ms, fn) => setTimeout(fn, ms);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || '') ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Things the demo's extras (extras.js) want to know about: what this tab sent and heard.
export const events = new EventTarget();
const emit = (type, detail) => events.dispatchEvent(new CustomEvent(type, { detail }));

// ---- The bus between tabs ----
const tabId = randomId();
/** @type {BroadcastChannel | null} */
let channel = null;
try {
  channel = new BroadcastChannel('wt-demo');
} catch {}
const handlers = new Set();
const deliver = (msg) => handlers.forEach((fn) => fn(msg));
// This tab's own copy goes through a MessageChannel rather than setTimeout: like a socket it
// arrives later and as a copy, and browsers don't slow it down in a background tab.
const local = new MessageChannel();
local.port1.onmessage = (e) => deliver(e.data);
// To every tab, this one included (a channel doesn't echo to its sender).
function post(msg) {
  try {
    channel?.postMessage(msg);
  } catch {}
  local.port2.postMessage(msg);
}
if (channel) channel.onmessage = (e) => deliver(e.data);

// ---- The fake WebSocket the app opens ----
/** @type {Map<string, DemoSocket>} */
const sockets = new Map();
let connSeq = 0;

class DemoSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor() {
    this.readyState = DemoSocket.CONNECTING;
    this.conn = `${tabId}.${++connSeq}`;
    this.epoch = null;
    /** @type {any} */ this.onopen = null;
    /** @type {any} */ this.onmessage = null;
    /** @type {any} */ this.onclose = null;
    /** @type {any} */ this.onerror = null;
    this.knockTimer = null;
    sockets.set(this.conn, this);
    this.knock();
  }

  // Ask until a server answers: right after a page load, the tab that runs it may still be starting.
  knock() {
    if (this.readyState !== DemoSocket.CONNECTING) return;
    post({ kind: 'open', conn: this.conn, tab: tabId });
    this.knockTimer = later(1500, () => this.knock());
  }

  opened(epoch) {
    if (this.readyState !== DemoSocket.CONNECTING) return;
    clearTimeout(this.knockTimer);
    this.epoch = epoch;
    this.readyState = DemoSocket.OPEN;
    this.onopen?.({ type: 'open' });
  }

  send(data) {
    if (this.readyState !== DemoSocket.OPEN) throw new DOMException('The socket is not open', 'InvalidStateError');
    const text = String(data);
    post({ kind: 'up', conn: this.conn, data: text });
    try {
      emit('sent', JSON.parse(text));
    } catch {}
  }

  close() {
    if (this.readyState >= DemoSocket.CLOSING) return;
    post({ kind: 'close', conn: this.conn });
    this.dropped();
  }

  dropped() {
    if (this.readyState === DemoSocket.CLOSED) return;
    clearTimeout(this.knockTimer);
    this.readyState = DemoSocket.CLOSED;
    sockets.delete(this.conn);
    this.onclose?.({ type: 'close', code: 1000 });
  }
}
win.WebSocket = DemoSocket;

handlers.add((msg) => {
  if (msg.kind === 'opened') sockets.get(msg.conn)?.opened(msg.epoch);
  else if (msg.kind === 'down') {
    const sock = sockets.get(msg.conn);
    if (sock?.readyState !== DemoSocket.OPEN) return;
    sock.onmessage?.({ data: msg.data });
    try {
      emit('received', JSON.parse(msg.data));
    } catch {}
  } else if (msg.kind === 'gone') sockets.get(msg.conn)?.dropped();
  // A new server took over (the tab running the old one closed): reconnect, the way the app
  // does after a real server restart. Its room state comes back from storage.
  else if (msg.kind === 'server-up') {
    for (const s of [...sockets.values()]) if (s.readyState === DemoSocket.OPEN && s.epoch !== msg.epoch) s.dropped();
  } else if (msg.kind === 'reset') resetHere();
});

// Lets the server notice a tab that went away without saying so.
const aliveTimer = setInterval(() => post({ kind: 'alive', tab: tabId }), 5000);
addEventListener('pagehide', () => {
  clearInterval(aliveTimer);
  post({ kind: 'tab-gone', tab: tabId });
});

// ---- The fake HTTP API ----
const realFetch = win.fetch.bind(win);
const pending = new Map();
let uploadDone = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const json = (status, body) => ({ status, body });

// Library calls go to the server, so a conversion started in one tab shows in all of them.
function askServer(method, url) {
  return new Promise((resolve) => {
    const id = randomId();
    const timer = later(6000, () => {
      pending.delete(id);
      resolve(json(503, { error: 'The demo is still starting. Try again in a moment.' }));
    });
    pending.set(id, (res) => {
      clearTimeout(timer);
      resolve(res);
    });
    post({ kind: 'req', id, tab: tabId, method, url });
  });
}
handlers.add((msg) => {
  if (msg.kind === 'res' && msg.tab === tabId) {
    pending.get(msg.id)?.({ status: msg.status, body: msg.body });
    pending.delete(msg.id);
  }
});

// Uploads run the app's real chunked upload code, but the chunks stop here. Only the start of
// a big file is read (40 chunks of 1 MiB), so the progress is real without reading gigabytes.
const UPLOAD_CHUNKS = 40;
const UPLOAD_CHUNK_BYTES = 1024 ** 2;
const uploads = new Map();

async function localApi(method, url, body) {
  const p = url.split('?')[0];
  if (p === '/api/session') return json(200, { login: false });
  // No STUN or TURN: the demo's calls are between tabs on this computer.
  if (p === '/api/ice') return json(200, []);
  if (p === '/api/uploads' && method === 'POST') {
    if (!/\.(mp4|m4v|mov|webm|mkv|avi|ts|m2ts|mts|wmv|flv|mpg|mpeg)$/i.test(body?.name || '')) return json(422, { error: 'Not a video file type the app accepts' });
    const id = randomId();
    const totalChunks = Math.max(1, Math.min(UPLOAD_CHUNKS, Math.ceil((body.size || 1) / UPLOAD_CHUNK_BYTES)));
    uploads.set(id, { name: body.name });
    return json(201, { id, totalChunks, chunkSize: UPLOAD_CHUNK_BYTES, received: [] });
  }
  const chunk = p.match(/^\/api\/uploads\/([^/]+)\/chunks\/\d+$/);
  if (chunk && method === 'PUT') {
    await sleep(120 + Math.random() * 160);
    return uploads.has(chunk[1]) ? json(200, {}) : json(404, { error: 'Unknown upload' });
  }
  const done = p.match(/^\/api\/uploads\/([^/]+)\/complete$/);
  if (done && method === 'POST') {
    const up = uploads.get(done[1]);
    uploads.delete(done[1]);
    if (!up) return json(404, { error: 'Unknown upload' });
    uploadDone = true;
    return json(200, { name: up.name, status: 'ready' });
  }
  if (/^\/api\/uploads\//.test(p)) return json(404, { error: 'Unknown upload' });
  if (/^\/api\/subtitles\//.test(p)) return json(403, { error: "the demo can't add subtitle files, but each film has made-up ones in the CC menu" });
  return askServer(method, p);
}

win.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
  if (typeof url !== 'string' || !url.startsWith('/api/')) return realFetch(input, init);
  const method = String(init.method || 'GET').toUpperCase();
  let body = null;
  if (typeof init.body === 'string') {
    try {
      body = JSON.parse(init.body);
    } catch {}
  }
  const res = await localApi(method, url, body);
  return new Response(res.status === 204 ? null : JSON.stringify(res.body ?? {}), { status: res.status, headers: { 'content-type': 'application/json' } });
};

// The app's message after an upload says the film is in the library. Here it isn't kept, so
// that one message is replaced with what actually happened.
const notice = document.getElementById('notice');
if (notice) {
  new MutationObserver(() => {
    if (!uploadDone || !/is in the library|Uploaded\. Converting/.test(notice.textContent || '')) return;
    uploadDone = false;
    notice.textContent = "Upload finished, all inside your browser. The demo doesn't keep files, so it won't show in the library.";
  }).observe(notice, { childList: true, characterData: true, subtree: true });
}

// ---- Drawn stand-ins for the camera ----
// The call is real WebRTC, but its video is a canvas, so the demo never asks for a camera or mic.
function drawnStream(draw, withAudio) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  const started = performance.now();
  const frame = () => draw(ctx, (performance.now() - started) / 1000);
  frame();
  // A timer, not requestAnimationFrame, so the picture keeps moving in a background tab.
  const timer = setInterval(frame, 1000 / 15);
  const stream = canvas.captureStream(15);
  /** @type {AudioContext | null} */
  let audio = null;
  if (withAudio) {
    try {
      // A silent track, so the call's mute button has something to mute.
      audio = new AudioContext();
      const dest = audio.createMediaStreamDestination();
      stream.addTrack(dest.stream.getAudioTracks()[0]);
    } catch {}
  }
  for (const t of stream.getTracks()) {
    const stop = t.stop.bind(t);
    t.stop = () => {
      stop();
      if (stream.getTracks().every((x) => x.readyState === 'ended')) {
        clearInterval(timer);
        audio?.close().catch(() => {});
      }
    };
  }
  return stream;
}

// Your own tile is shown mirrored, like a camera, so it has no text, only a shape.
function drawYou(ctx, t) {
  const { width: w, height: h } = ctx.canvas;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#2a1d31');
  g.addColorStop(1, '#4a2533');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const sway = Math.sin(t * 0.8) * 6;
  ctx.fillStyle = '#7a2b4a';
  ctx.beginPath();
  ctx.ellipse(w / 2 + sway, h + 40, 150, 130, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#b83a62';
  ctx.beginPath();
  ctx.arc(w / 2 + sway, h / 2 - 10, 62, 0, Math.PI * 2);
  ctx.fill();
}

function drawSam(ctx, t) {
  const { width: w, height: h } = ctx.canvas;
  const g = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.7);
  g.addColorStop(0, '#3b2a45');
  g.addColorStop(1, '#140d18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // A soft ring that breathes, so it reads as live video rather than a still.
  const r = 78 + Math.sin(t * 2) * 4;
  ctx.strokeStyle = 'rgba(242,167,195,0.35)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 - 16, r + 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f2a7c3';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 - 16, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#140d18';
  ctx.font = '400 84px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', w / 2, h / 2 - 12);
  ctx.fillStyle = '#f7eaf1';
  ctx.font = '600 22px system-ui, sans-serif';
  // Kept short and centred: the call's own picture of you sits over the bottom right corner.
  ctx.fillText('Sam', w / 2, h - 66);
  ctx.fillStyle = '#bfa9bd';
  ctx.font = '400 17px system-ui, sans-serif';
  ctx.fillText('a pretend friend', w / 2, h - 40);
}

if (navigator.mediaDevices) {
  Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => drawnStream(drawYou, true) });
}

// ---- Reset ----
let resetting = false;
function resetHere() {
  resetting = true;
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('wt-')) localStorage.removeItem(k);
    sessionStorage.clear();
  } catch {}
  location.href = location.pathname;
}
export function resetDemo() {
  post({ kind: 'reset' });
}
/** Whether this tab shares one server with the demo's other tabs (false in a sandboxed frame). */
export const tabsShareServer = () => channel !== null;

// =====================================================================================
// The server: runs in one tab.
// =====================================================================================
function startServer() {
  const epoch = randomId();
  const saved = readJSON(KEYS.rooms, {});
  const rooms = createRooms({ restore: (code) => saved[code] ?? null });
  /** @type {Map<string, {id: string, tab: string, send(msg: object): void}>} */
  const members = new Map();
  const tabSeen = new Map();
  const sams = new Map();
  // Films Sam has already "downloaded" in a room, so coming back to a room doesn't make it wait again.
  const samLoaded = new Set();

  // ---- sockets ----
  function connect(conn, tab) {
    if (!members.has(conn)) {
      members.set(conn, { id: conn, tab, send: (msg) => post({ kind: 'down', conn, data: JSON.stringify(msg) }) });
    }
    tabSeen.set(tab, Date.now());
    post({ kind: 'opened', conn, epoch });
  }

  function disconnect(conn, tell) {
    const m = members.get(conn);
    if (!m) return;
    members.delete(conn);
    const code = /** @type {any} */ (m).roomCode;
    rooms.leave(m);
    if (tell) post({ kind: 'gone', conn });
    if (code != null) later(0, () => samCheck(code));
  }

  function fromClient(conn, data) {
    const m = members.get(conn);
    if (!m) return post({ kind: 'gone', conn });
    const msg = parseClientMessage(data);
    if (!msg) return;
    if (msg.type === 'ping') return m.send({ type: 'pong', t: msg.t, serverNow: Date.now() });
    rooms.handle(m, msg);
    if (msg.type === 'join') later(0, () => samCheck(msg.room));
  }

  // A tab that stopped saying it's alive is gone. Generous, since browsers slow down the
  // timers of background tabs to as little as once a minute.
  setInterval(() => {
    const now = Date.now();
    for (const [conn, m] of members) if (now - (tabSeen.get(m.tab) ?? now) > 150_000) disconnect(conn, true);
  }, 10_000);

  // ---- library ----
  const lib = readJSON(KEYS.library, { added: [], adaptive: [] });
  const jobs = [];
  let jobSeq = 1;
  const listed = () => FILMS.filter((f) => !f.hidden || lib.added.includes(f.name));
  const toAll = (msg) => members.forEach((m) => m.send(msg));
  const publicJobs = () => jobs.map(({ id, kind, name, status, progress }) => ({ id, kind, name, status, progress }));
  const saveLibrary = () => writeJSON(KEYS.library, lib);

  function runJob(job, onDone) {
    job.status = 'converting';
    const started = Date.now();
    const length = job.kind === 'hls' ? 9000 : 7000;
    const timer = setInterval(() => {
      job.progress = Math.min(1, (Date.now() - started) / length);
      if (job.progress >= 1) {
        clearInterval(timer);
        job.status = 'done';
        onDone();
        toAll({ type: 'library' });
        // Finished jobs stay a little while so everyone sees the outcome, as on the server.
        later(8000, () => {
          jobs.splice(jobs.indexOf(job), 1);
          toAll({ type: 'jobs', jobs: publicJobs() });
        });
      }
      toAll({ type: 'jobs', jobs: publicJobs() });
    }, 400);
  }

  function api(method, url) {
    const m = url.match(/^\/api\/library(?:\/([^/]+)(?:\/(info|convert|adaptive))?)?$/);
    if (!m) return json(404, { error: 'Not found' });
    let name = null;
    try {
      name = m[1] ? decodeURIComponent(m[1]) : null;
    } catch {
      return json(404, { error: 'Not found' });
    }
    const film = name ? listed().find((f) => f.name === name) : null;
    if (!name && method === 'GET') {
      const files = listed().map(({ name: n, size, duration, video, audio, playable }) => ({ name: n, size, duration, video, audio, playable, adaptive: lib.adaptive.includes(n) }));
      const bytes = files.reduce((s, f) => s + f.size, 0);
      return json(200, { files, jobs: publicJobs(), bytes, free: 512 * 1024 ** 3, converter: 'libx264' });
    }
    if (!film) return json(404, { error: 'Not found' });
    if (m[2] === 'info' && method === 'GET') {
      // Always the plain file: the adaptive (HLS) player is left out of the demo to keep it small.
      return json(200, { name, adaptive: false, hlsUrl: null, subtitles: film.subtitles });
    }
    if (m[2] === 'convert' && method === 'POST') {
      if (film.playable) return json(409, { error: 'Already playable in browsers' });
      if (jobs.some((j) => j.source === name)) return json(409, { error: 'Already converting' });
      if (lib.added.includes(film.convertsTo)) return json(409, { error: 'Already converted' });
      const job = { id: jobSeq++, kind: 'convert', name: film.convertsTo, source: name, status: 'queued', progress: 0 };
      jobs.push(job);
      toAll({ type: 'jobs', jobs: publicJobs() });
      runJob(job, () => {
        lib.added.push(film.convertsTo);
        saveLibrary();
      });
      return json(202, { name: film.convertsTo, status: 'queued', job: job.id });
    }
    if (m[2] === 'adaptive' && method === 'POST') {
      if (jobs.some((j) => j.kind === 'hls' && j.name === name)) return json(409, { error: 'Already being prepared' });
      const job = { id: jobSeq++, kind: 'hls', name, source: name, status: 'queued', progress: 0 };
      jobs.push(job);
      toAll({ type: 'jobs', jobs: publicJobs() });
      runJob(job, () => {
        lib.adaptive.push(name);
        saveLibrary();
      });
      return json(202, { name, status: 'queued', job: job.id });
    }
    if (!m[2] && method === 'DELETE') return json(403, { error: 'deleting is turned off in the demo' });
    return json(404, { error: 'Not found' });
  }

  // ---- room snapshots, so a reload or a new server tab picks up where things were ----
  function saveRooms() {
    if (resetting) return;
    const all = readJSON(KEYS.rooms, {});
    for (const room of rooms.rooms.values()) if ([...room.clients].some((c) => !sams.has(c))) all[room.code] = rooms.snapshot(room);
    writeJSON(KEYS.rooms, all);
  }
  setInterval(saveRooms, 2000);
  addEventListener('pagehide', saveRooms);
  setInterval(rooms.tick, 5000);

  handlers.add((msg) => {
    if (msg.kind === 'open') connect(msg.conn, msg.tab);
    else if (msg.kind === 'up') fromClient(msg.conn, msg.data);
    else if (msg.kind === 'close') disconnect(msg.conn, false);
    else if (msg.kind === 'alive') tabSeen.set(msg.tab, Date.now());
    else if (msg.kind === 'req') post({ kind: 'res', id: msg.id, tab: msg.tab, ...api(msg.method, msg.url) });
    else if (msg.kind === 'tab-gone') {
      for (const [conn, m] of members) if (m.tab === msg.tab) disconnect(conn, false);
    }
  });

  // =====================================================================================
  // Sam: a scripted friend who joins a room when you're alone in it. Sam is a member of the
  // room like anyone else and only ever sends what a real page could send.
  // =====================================================================================
  const realPeople = (code) => [...(rooms.rooms.get(code)?.clients ?? [])].filter((c) => !sams.has(c));
  const samTimers = new Map();

  // Sam keeps someone alone company, and steps out once a second person (or tab) arrives:
  // the call is built for two.
  function samCheck(code) {
    const n = realPeople(code).length;
    const sam = [...sams.keys()].find((s) => s.roomCode === code);
    clearTimeout(samTimers.get(code));
    if (n === 1 && !sam) samTimers.set(code, later(2500, () => realPeople(code).length === 1 && samJoin(code)));
    else if (n >= 2 && sam) sams.get(sam).leave("Looks like you've got company. I'll leave you two to it 👋");
    // A refresh drops you for a moment; Sam waits a bit before leaving an empty room.
    else if (n === 0 && sam) samTimers.set(code, later(8000, () => realPeople(code).length === 0 && sams.get(sam)?.leave()));
  }

  function samJoin(code) {
    /** @type {any} */
    const member = { id: `sam-${randomId()}`, send: (msg) => later(0, () => sam.hear(msg)) };
    const sam = createSam(member, code);
    sams.set(member, sam);
    rooms.handle(member, { type: 'join', room: code, clientId: 'demo-sam', name: 'Sam' });
  }

  function createSam(member, code) {
    const say = (msg) => {
      const parsed = parseClientMessage(JSON.stringify(msg));
      if (parsed && sams.has(member)) rooms.handle(member, parsed);
    };
    const chat = (text, delay = 900) => later(delay, () => say({ type: 'chat', text }));
    let state = null;
    let control = { mode: 'everyone', isHost: false };
    let reactedTo = null;
    let pausedOnce = false;
    let runTimer = null;
    let reactTimer = null;
    let reactions = 0;
    const call = createSamCall(say);

    const greeted = readJSON(KEYS.greeted, []);
    // On a return visit the hello waits for the room's state, so it fits what's on screen.
    let welcomeBack = greeted.includes(code);
    if (!welcomeBack) {
      writeJSON(KEYS.greeted, [...greeted, code]);
      chat("Hi! I'm Sam, the pretend friend in this demo. I'll watch along with you.", 1200);
      chat('Pick a film from the Library and press play. Try the Ready? button too.', 4200);
    }

    const position = () => (state.paused || state.stalled ? state.position : state.position + Math.max(0, Date.now() - state.updatedAt) / 1000);
    const running = () => state && state.src && !state.paused && !state.stalled;

    function onState(next) {
      state = next;
      if (state.src !== reactedTo) {
        reactedTo = state.src;
        reactions = 0;
      }
      if (welcomeBack) {
        welcomeBack = false;
        chat(running() ? "I'm back! Catching up with you." : 'Back again! Press play whenever you like.', 1200);
      }
      // First play of a film in this room: Sam's download is slow, so the room waits for Sam,
      // then everyone starts on the same frame. This is the buffering wait the real server runs.
      const film = `${code}\n${state.src}`;
      if (state.src && !state.paused && !samLoaded.has(film)) {
        samLoaded.add(film);
        say({ type: 'buffering', value: true });
        later(2600, () => say({ type: 'buffering', value: false }));
        chat('Sorry, my internet is slow. One sec…', 300);
      }
      clearTimeout(runTimer);
      clearTimeout(reactTimer);
      if (!running()) return;
      // Once per visit, about half a minute in, Sam pauses for everyone (or tries to, if you
      // locked the remote), then plays again.
      if (!pausedOnce && position() < 40) {
        runTimer = later(Math.max(1000, (28 - position()) * 1000), () => {
          if (!running() || pausedOnce) return;
          pausedOnce = true;
          if (control.mode === 'host' && !control.isHost) {
            chat("I tried to pause for a drink, but you've got the remote. Fair 😄", 0);
            return;
          }
          chat('Pausing for a sec, grabbing water 🥤', 0);
          say({ type: 'pause', position: position() });
          later(6000, () => {
            if (!state.paused) return;
            say({ type: 'play', position: state.position });
            chat('Back! Did I miss anything?', 400);
          });
        });
      }
      if (reactions < 6) {
        reactTimer = later(9000 + Math.random() * 9000, () => {
          if (!running()) return;
          reactions++;
          say({ type: 'reaction', emoji: pick(REACTIONS) });
          onState(state);
        });
      }
    }

    const REPLIES = [
      'Haha, yes.',
      'This part is so good.',
      'Agreed!',
      "I'm a pretend friend, so I only know a few lines. Try opening a second tab to see real syncing 😉",
      'Shh, the good bit is coming.',
    ];

    function hear(msg) {
      if (!sams.has(member)) return;
      switch (msg.type) {
        case 'state':
        case 'tick':
          onState(msg.state);
          break;
        case 'control':
          control = msg;
          break;
        case 'chat':
          chat(/\b(hi|hey|hello)\b/i.test(msg.text) ? 'Hey you! 👋' : pick(REPLIES), 900 + Math.random() * 900);
          break;
        case 'reaction':
          if (Math.random() < 0.5) later(700, () => say({ type: 'reaction', emoji: pick(['❤️', '😂', '🔥']) }));
          break;
        case 'readycheck':
          if (msg.mine) {
            later(1300, () => say({ type: 'ready' }));
            chat('Ready! 🍿', 1100);
          }
          break;
        case 'signal':
          call.signal(msg);
          break;
      }
    }

    function leave(text) {
      if (!sams.has(member)) return;
      if (text) say({ type: 'chat', text });
      clearTimeout(runTimer);
      clearTimeout(reactTimer);
      call.close();
      sams.delete(member);
      rooms.leave(member);
    }

    return { hear, leave };
  }

  // Sam answers calls. Sam never calls first, which keeps the negotiation one-sided and simple.
  function createSamCall(say) {
    /** @type {RTCPeerConnection | null} */
    let pc = null;
    /** @type {MediaStream | null} */
    let stream = null;

    function close() {
      pc?.close();
      pc = null;
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    }

    async function signal({ description, candidate, bye }) {
      try {
        if (bye) return close();
        if (description?.type === 'offer') {
          if (!pc) {
            pc = new RTCPeerConnection({ iceServers: [] });
            pc.onicecandidate = ({ candidate: c }) => c && say({ type: 'signal', candidate: c.toJSON() });
          }
          await pc.setRemoteDescription(description);
          if (!stream) {
            stream = drawnStream(drawSam, false);
            for (const t of stream.getTracks()) pc.addTrack(t, stream);
          }
          await pc.setLocalDescription(await pc.createAnswer());
          say({ type: 'signal', description: pc.localDescription.toJSON() });
        } else if (candidate && pc) {
          await pc.addIceCandidate(candidate).catch(() => {});
        }
      } catch (err) {
        console.warn('demo call failed', err);
      }
    }

    return { signal, close };
  }

  post({ kind: 'server-up', epoch });
  return { epoch };
}

// One tab runs the server: whichever holds the lock. When it closes, the lock passes on.
let shared = !!channel;
try {
  if (!navigator.locks?.request) shared = false;
} catch {
  shared = false;
}
if (shared) {
  navigator.locks
    .request('wt-demo-server', () => {
      startServer();
      // Held until this tab closes.
      return new Promise(() => {});
    })
    .catch(() => {
      channel?.close();
      channel = null;
      startServer();
    });
} else {
  // On its own: no other tab to share with, and no risk of two servers answering.
  channel?.close();
  channel = null;
  startServer();
}
