// State shared between the page's modules: the socket, who we are, and what the room told us.
// Each field has one module that writes it (noted below); the others only read.
import { setStatus } from './ui.js';

export const S = {
  /** @type {WebSocket | null} app.js */
  ws: null,
  /** @type {string | null} app.js */
  roomCode: null,
  myName: 'Guest', // app.js
  /** @type {string | null} our socket id, for WebRTC politeness. app.js */
  myId: null,
  /** @type {string | null} the film our player has loaded. player.js */
  currentSrc: null,
  /** @type {{src: string | null, paused: boolean, stalled: boolean, position: number, updatedAt: number} | null} last anchor from the server. player.js */
  roomState: null,
  /** @type {{mode: string, isHost: boolean, hostName: string | null, people?: {name: string, host: boolean, loading: boolean, me: boolean}[]}} app.js */
  control: { mode: 'everyone', isHost: true, hostName: null },
  /** @type {string[]} app.js */
  queue: [],
  readyActive: false, // library.js
};

export function send(msg) {
  if (S.ws && S.ws.readyState === WebSocket.OPEN) S.ws.send(JSON.stringify(msg));
}

export const locked = () => S.control.mode === 'host' && !S.control.isHost;

export function deny() {
  setStatus(`${S.control.hostName || 'The host'} controls playback in this room`);
}
