// Entry point: the join form, the room socket and where each server message goes.
// The rest of the page lives in its own modules (see index.html's single <script>):
//   player.js   sync loop, video events, controls, keyboard
//   tracks.js   adaptive source, subtitles, audio/quality menu
//   library.js  library drawer, up next, "ready?"
//   upload.js   resumable uploads
//   call.js     WebRTC call     stage.js  fullscreen, pop-out
//   chat.js     chat, reactions presence.js who's here, host lock
import { $, setStatus } from './ui.js';
import { S, send } from './state.js';
import { onState, onPong, resetSync } from './player.js';
import { loadFiles, showJobs, renderQueue, renderReadyCheck } from './library.js';
import { onPeers, handleSignal, resetCall } from './call.js';
import { renderPresence, showControl } from './presence.js';
import { addMessage, floatEmoji } from './chat.js';
import './upload.js';

let retry = 0;

// Survives a refresh but stays per-tab, so the host role sticks across reconnects.
const clientId = (() => {
  const fresh = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  try {
    const id = sessionStorage.getItem('wt-client') || fresh;
    sessionStorage.setItem('wt-client', id);
    return id;
  } catch {
    return fresh;
  }
})();

// Fast pings until the estimate settles, then just enough to follow clock drift.
function pingLoop(sock, count) {
  if (sock !== S.ws || sock.readyState !== WebSocket.OPEN) return;
  sock.send(JSON.stringify({ type: 'ping', t: Date.now() }));
  setTimeout(() => pingLoop(sock, count + 1), count < 5 ? 2000 : 30000);
}

const handlers = {
  hello: (msg) => (S.myId = msg.id),
  state: (msg) => {
    onPeers(msg.peers);
    onState(msg.state, true, msg.serverNow);
    renderPresence();
  },
  tick: (msg) => onState(msg.state, false, msg.serverNow),
  pong: onPong,
  control: (msg) => {
    S.control = msg;
    showControl();
  },
  peers: (msg) => onPeers(msg.peers),
  signal: handleSignal,
  queue: (msg) => {
    S.queue = msg.queue;
    renderQueue();
  },
  readycheck: renderReadyCheck,
  jobs: (msg) => showJobs(msg.jobs),
  library: () => loadFiles(),
  chat: (msg) => addMessage(msg.name, msg.text, false),
  reaction: (msg) => floatEmoji(msg.emoji),
};

function connect() {
  const sock = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  S.ws = sock;
  sock.onopen = () => {
    retry = 0;
    resetSync();
    resetCall();
    send({ type: 'join', room: S.roomCode, clientId, name: S.myName });
    pingLoop(sock, 0);
  };
  sock.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    handlers[msg.type]?.(msg);
  };
  sock.onclose = () => {
    if (sock !== S.ws) return;
    setStatus('Reconnecting…');
    setTimeout(connect, Math.min(1000 * 2 ** retry++, 10000));
  };
}

function joinRoom(e) {
  e?.preventDefault();
  S.roomCode = $('code').value.trim();
  if (!S.roomCode) return $('code').focus();
  S.myName = $('name').value.trim() || 'Guest';
  $('roomLabel').textContent = `· ${S.roomCode}`;
  try {
    localStorage.setItem('wt-name', S.myName);
    localStorage.setItem('wt-room', S.roomCode);
  } catch {}
  // A shareable address for this room.
  history.replaceState(null, '', `?room=${encodeURIComponent(S.roomCode)}`);
  // The click doubles as the user gesture browsers require before autoplay.
  $('join').hidden = true;
  $('room').hidden = false;
  loadFiles();
  connect();
}
$('joinForm').onsubmit = joinRoom;
try {
  $('name').value = localStorage.getItem('wt-name') || '';
  $('code').value = new URLSearchParams(location.search).get('room') || localStorage.getItem('wt-room') || '';
} catch {}
($('name').value ? $('code') : $('name')).focus();
if ($('name').value && $('code').value) $('joinBtn').textContent = `Rejoin ${$('code').value}`;
$('code').addEventListener('input', () => ($('joinBtn').textContent = 'Join room'));

$('inviteBtn').onclick = async () => {
  const link = `${location.origin}${location.pathname}?room=${encodeURIComponent(S.roomCode)}`;
  try {
    await navigator.clipboard.writeText(link);
    setStatus('Invite link copied. Send it to your person.');
  } catch {
    prompt('Copy this invite link', link);
  }
};

// "Sign out" only when there's a login to sign out of.
fetch('/api/session')
  .then((r) => r.json())
  .then((s) => ($('logoutForm').hidden = !s.login))
  .catch(() => {});
