// The WebSocket protocol, shared by the page and the server so the two can't drift apart.
// parseClientMessage is the only way a client message reaches the room logic: it returns a
// message with known fields of known types, or null for anything else.
//
// Client -> server: join, ping, control, buffering, chat, signal, reaction, queue-add,
//   queue-remove, ready-check, ready, ready-cancel, ended, src, play, pause, seek.
// Server -> client: hello, state, tick, pong, peers, control, queue, readycheck, chat, signal,
//   reaction, jobs, library.

export const REACTIONS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];

export const LIMITS = {
  room: 32,
  clientId: 64,
  name: 24,
  chat: 500,
  queue: 50,
  fileName: 255,
};

// What the library lists and the player can load.
export const LIBRARY_EXT = /\.(mp4|m4v|mov|webm)$/i;

/**
 * A film a client asks the room to play: a plain file name with a library extension, so it can
 * only ever point inside /media. It needn't exist yet (a conversion may still be running), and
 * non-ASCII names dropped into media/ by hand are fine, so this checks shape, not the listing.
 */
export function toSrc(v) {
  const s = typeof v === 'string' ? v : '';
  if (!s || s.length > LIMITS.fileName || s.startsWith('.') || /[\\/\0]/.test(s) || !LIBRARY_EXT.test(s)) return null;
  return s;
}

// A playback position: finite and not negative. Infinity would turn into null in JSON and
// break every client's sync math.
export function toPosition(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));

/** @param {unknown} raw a socket message (text or Buffer) */
export function parseClientMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return null;
  }
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return null;
  const { type } = msg;
  switch (type) {
    case 'join': {
      const room = str(msg.room).trim().slice(0, LIMITS.room);
      if (!room) return null;
      return {
        type,
        room,
        clientId: msg.clientId ? str(msg.clientId).slice(0, LIMITS.clientId) : null,
        name: str(msg.name).trim().slice(0, LIMITS.name) || 'Guest',
      };
    }
    case 'ping':
      return { type, t: msg.t };
    case 'control':
      return { type, mode: msg.mode === 'host' ? 'host' : 'everyone' };
    case 'buffering':
      return { type, value: !!msg.value };
    case 'chat': {
      const text = str(msg.text).trim().slice(0, LIMITS.chat);
      return text ? { type, text } : null;
    }
    case 'signal':
      // WebRTC offer/answer/ICE, relayed as-is: the browsers on each end check them.
      if (!msg.description && !msg.candidate && !msg.bye) return null;
      return { type, description: msg.description, candidate: msg.candidate, bye: msg.bye };
    case 'reaction':
      return REACTIONS.includes(msg.emoji) ? { type, emoji: msg.emoji } : null;
    case 'queue-add':
    case 'src': {
      const src = toSrc(msg.src);
      return src ? { type, src } : null;
    }
    case 'queue-remove':
      return Number.isInteger(msg.index) && msg.index >= 0 ? { type, index: msg.index } : null;
    case 'ended':
      return { type, src: str(msg.src) };
    case 'play':
    case 'pause':
    case 'seek':
      return { type, position: toPosition(msg.position) };
    case 'ready-check':
    case 'ready':
    case 'ready-cancel':
      return { type };
    default:
      return null;
  }
}
