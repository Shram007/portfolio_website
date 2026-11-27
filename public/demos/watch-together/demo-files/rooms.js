// Room logic: playback state, buffer waits, host lock, queue, "ready?" checks, chat relay.
// No sockets and no real timers in here. A member is anything with {id, send(msg)}; time comes
// from an injected clock. The server wires sockets to it, and tests drive it with a fake clock.
import { LIMITS } from '../protocol.js';

/**
 * @typedef {{ now(): number, setTimeout(fn: () => void, ms: number): any, clearTimeout(t: any): void }} Clock
 * @typedef {{ id: string, send(msg: object): void, clientId?: string, name?: string, roomCode?: string | null }} Member
 * @typedef {{ src: string | null, paused: boolean, stalled: boolean, position: number, updatedAt: number }} PlayState
 * @typedef {{ by: string, waiting: Set<string>, timer: any }} ReadyCheck
 * @typedef {{
 *   code: string, state: PlayState, clients: Set<Member>, buffering: Set<Member>,
 *   stallTimer: any, stalledAt: number, cooldownUntil: number, deleteTimer: any, controlMode: 'everyone' | 'host',
 *   hostClientId: string | null, hostTimer: any, queue: string[], readyCheck: ReadyCheck | null,
 * }} Room
 * @typedef {{ src?: string | null, position?: number, controlMode?: string, hostClientId?: string | null, queue?: string[] }} Snapshot
 */

/** @type {Clock} */
export const realClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => {
    const t = setTimeout(fn, ms);
    // Room timers must never keep the process alive on shutdown.
    t.unref?.();
    return t;
  },
  clearTimeout: (t) => clearTimeout(t),
};

export const DEFAULT_TIMING = {
  roomGraceMs: 10 * 60 * 1000,
  stallCapMs: 20_000,
  stallCooldownMs: 10_000,
  startDelayMs: 400,
  hostGraceMs: 15_000,
  readyTimeoutMs: 60_000,
};

// Messages a guest may not send while the host has locked the room.
const HOST_ONLY = new Set(['src', 'play', 'pause', 'seek', 'queue-add', 'queue-remove', 'ready-check']);

/**
 * Position now, accounting for time elapsed while running. A future updatedAt is a scheduled
 * start: the position holds until then.
 * @param {PlayState} state
 */
export function currentPosition(state, now) {
  if (state.paused || state.stalled) return state.position;
  return state.position + Math.max(0, now - state.updatedAt) / 1000;
}

/**
 * @param {{ timing?: Partial<typeof DEFAULT_TIMING>, clock?: Clock, restore?: (code: string) => Snapshot | null | undefined, log?: (msg: string, fields?: object) => void }} [opts]
 */
export function createRooms({ timing = {}, clock = realClock, restore = () => null, log = () => {} } = {}) {
  const t = { ...DEFAULT_TIMING, ...timing };
  /** @type {Map<string, Room>} */
  const rooms = new Map();

  /** @returns {Room} */
  function newRoom(code) {
    /** @type {Room} */
    const room = {
      code,
      // paused: the users' intent (what the play button shows). stalled: the room is waiting for
      // someone to load. Both freeze the position, but ending a stall never overrides a pause.
      state: { src: null, paused: true, stalled: false, position: 0, updatedAt: clock.now() },
      clients: new Set(),
      // Members that reported less than a couple of seconds buffered ahead.
      buffering: new Set(),
      stallTimer: null,
      stalledAt: 0, // when the current wait began, for the log
      cooldownUntil: 0,
      deleteTimer: null,
      controlMode: 'everyone', // or 'host': only the host may play, pause, seek or load
      hostClientId: null,
      hostTimer: null,
      queue: [], // file names to play next, in order
      readyCheck: null,
    };
    const saved = restore(code);
    if (saved) {
      room.state.src = saved.src ?? null;
      room.state.position = Number(saved.position) || 0;
      room.controlMode = saved.controlMode === 'host' ? 'host' : 'everyone';
      room.hostClientId = saved.hostClientId ?? null;
      room.queue = Array.isArray(saved.queue) ? saved.queue.slice(0, LIMITS.queue) : [];
    }
    return room;
  }

  // The state is an anchor (position at updatedAt, server clock). Clients evaluate it with their
  // estimate of server time, so everyone computes the same position however late the message arrives.
  const stateMsg = (room, type = 'state') => ({ type, state: { ...room.state }, serverNow: clock.now(), peers: room.clients.size });

  function broadcast(room, msg, except) {
    for (const c of room.clients) if (c !== except) c.send(msg);
  }

  function clearStallTimer(room) {
    clock.clearTimeout(room.stallTimer);
    room.stallTimer = null;
  }

  const wantStall = (room) => !room.state.paused && room.buffering.size > 0 && clock.now() >= room.cooldownUntil;

  const names = (members) => [...members].map((c) => c.name).join(', ');

  // Freeze or unfreeze the room at its current position, and tell everyone.
  // Logged because a stall is what both people notice, and the server is the only place
  // that sees both sides of it.
  function setStalled(room, stalled, reason = 'loaded') {
    const s = room.state;
    const now = clock.now();
    s.position = currentPosition(s, now);
    s.stalled = stalled;
    if (stalled) {
      room.stalledAt = now;
      log('waiting for load', { room: room.code, at: Math.round(s.position), for: names(room.buffering) });
    } else {
      const fields = { room: room.code, at: Math.round(s.position), waitedMs: now - room.stalledAt, reason };
      log('resumed', reason === 'cap' ? { ...fields, without: names(room.buffering) } : fields);
    }
    // Resuming is a scheduled start too, so nobody gets a head start.
    s.updatedAt = stalled || s.paused ? now : now + t.startDelayMs;
    clearStallTimer(room);
    if (stalled) {
      room.stallTimer = clock.setTimeout(() => {
        room.stallTimer = null;
        // Waited long enough. The straggler stays in `buffering` and won't send another
        // edge, so the cooldown is what stops an instant re-freeze if anything re-evaluates.
        room.cooldownUntil = clock.now() + t.stallCooldownMs;
        if (room.state.stalled) setStalled(room, false, 'cap');
      }, t.stallCapMs);
    }
    broadcast(room, stateMsg(room));
  }

  function evaluateStall(room, reason) {
    const want = wantStall(room);
    if (want !== room.state.stalled) setStalled(room, want, reason);
  }

  const isHost = (room, m) => room.hostClientId === m.clientId;

  function sendQueue(room, to) {
    const msg = { type: 'queue', queue: room.queue };
    if (to) to.send(msg);
    else broadcast(room, msg);
  }

  // Each member hears whether it still owes an answer.
  function sendReady(room) {
    const rc = room.readyCheck;
    for (const c of room.clients) {
      c.send({
        type: 'readycheck',
        active: !!rc,
        by: rc?.by ?? null,
        waiting: rc ? [...room.clients].filter((p) => rc.waiting.has(p.clientId)).map((p) => p.name) : [],
        mine: !!rc && rc.waiting.has(c.clientId),
      });
    }
  }

  // Apply a playback change: schedule the start, reset the buffer-wait window, tell everyone.
  function commit(room, kind) {
    const s = room.state;
    // Starting or jumping while running is scheduled slightly ahead, so every client
    // has the message before the moment it describes and all begin together.
    s.updatedAt = clock.now() + (s.paused ? 0 : t.startDelayMs);
    // An explicit play or seek earns a fresh waiting window, even right after a cap ran out.
    if (kind !== 'pause') room.cooldownUntil = 0;
    s.stalled = false;
    clearStallTimer(room);
    // Any other playback command answers a pending "ready?" question.
    if (room.readyCheck && kind !== 'ready') endReadyCheck(room, false);
    // Sent to everyone, sender included: the server's ordering is the single source of truth.
    if (wantStall(room)) setStalled(room, true);
    else broadcast(room, stateMsg(room));
  }

  function endReadyCheck(room, start) {
    if (!room.readyCheck) return;
    clock.clearTimeout(room.readyCheck.timer);
    room.readyCheck = null;
    if (start) {
      room.state.paused = false;
      commit(room, 'ready');
    }
    sendReady(room);
  }

  // Everyone still here has answered: go.
  function maybeStartReadyCheck(room) {
    const rc = room.readyCheck;
    if (!rc) return;
    const here = new Set([...room.clients].map((c) => c.clientId));
    for (const id of rc.waiting) if (!here.has(id)) rc.waiting.delete(id);
    if (rc.waiting.size === 0) endReadyCheck(room, true);
    else sendReady(room);
  }

  // Each member hears whether it is the host, plus who's here and who is still loading,
  // so this can't be a plain broadcast.
  function sendControl(room) {
    const host = [...room.clients].find((c) => isHost(room, c));
    for (const c of room.clients) {
      const people = [...room.clients].map((p) => ({ name: p.name, host: isHost(room, p), loading: room.buffering.has(p), me: p === c }));
      c.send({ type: 'control', mode: room.controlMode, isHost: isHost(room, c), hostName: host?.name ?? null, people });
    }
  }

  // Hand the host role on when the host is really gone, not on a brief reconnect.
  function scheduleHostHandoff(room) {
    clock.clearTimeout(room.hostTimer);
    room.hostTimer = clock.setTimeout(() => {
      room.hostTimer = null;
      if ([...room.clients].some((c) => isHost(room, c))) return;
      const next = room.clients.values().next().value;
      room.hostClientId = next?.clientId ?? null;
      // With nobody left to steer, a locked room would just be stuck.
      if (!next) room.controlMode = 'everyone';
      sendControl(room);
    }, t.hostGraceMs);
  }

  /** @param {Member} m @param {{ room: string, clientId: string | null, name: string }} msg */
  function join(m, msg) {
    // One room per member: leave the old one properly, or it keeps a phantom member
    // forever (never empties, never gets deleted, may keep a host who isn't there).
    leave(m);
    const code = msg.room;
    if (!rooms.has(code)) rooms.set(code, newRoom(code));
    const room = /** @type {Room} */ (rooms.get(code));
    clock.clearTimeout(room.deleteTimer);
    room.deleteTimer = null;
    // A stable id from the browser, so a refresh or reconnect keeps the host role.
    m.clientId = msg.clientId || m.id;
    m.name = msg.name;
    m.roomCode = code;
    room.clients.add(m);
    log('joined', { room: code, name: m.name, peers: room.clients.size });
    if (!room.hostClientId) room.hostClientId = m.clientId;
    m.send({ type: 'hello', id: m.id });
    m.send(stateMsg(room));
    broadcast(room, { type: 'peers', peers: room.clients.size }, m);
    sendControl(room);
    sendQueue(room, m);
    if (room.readyCheck) sendReady(room);
  }

  /** Take a member out of its room (on disconnect, or before joining another). @param {Member} m */
  function leave(m) {
    const room = m.roomCode != null ? rooms.get(m.roomCode) : undefined;
    m.roomCode = null;
    if (!room || !room.clients.has(m)) return;
    room.clients.delete(m);
    room.buffering.delete(m);
    if (isHost(room, m)) scheduleHostHandoff(room);
    if (room.clients.size === 0) {
      clearStallTimer(room);
      endReadyCheck(room, false);
      room.state = { ...room.state, position: currentPosition(room.state, clock.now()), paused: true, stalled: false, updatedAt: clock.now() };
      // Only delete the room this timer was set for, not a newer one under the same code.
      room.deleteTimer = clock.setTimeout(() => rooms.get(room.code) === room && rooms.delete(room.code), t.roomGraceMs);
    } else {
      broadcast(room, { type: 'peers', peers: room.clients.size });
      evaluateStall(room, 'left');
      sendControl(room);
      maybeStartReadyCheck(room);
    }
  }

  /** Apply one parsed client message (see parseClientMessage). @param {Member} m @param {any} msg */
  function handle(m, msg) {
    if (msg.type === 'join') return join(m, msg);
    const room = m.roomCode != null ? rooms.get(m.roomCode) : undefined;
    if (!room) return;
    const s = room.state;

    // Host-only mode. The sender's page is snapped back to the room by a fresh state.
    if (HOST_ONLY.has(msg.type) && room.controlMode === 'host' && !isHost(room, m)) {
      m.send(stateMsg(room));
      sendQueue(room, m);
      return;
    }

    switch (msg.type) {
      case 'control':
        if (!isHost(room, m)) return;
        room.controlMode = msg.mode;
        sendControl(room);
        return;
      case 'buffering': {
        const was = room.buffering.has(m);
        if (msg.value) room.buffering.add(m);
        else room.buffering.delete(m);
        // Loaded again while the room runs on: they were left behind by the cap and caught up.
        if (was && !msg.value && !s.paused && !s.stalled) log('caught up', { room: room.code, name: m.name });
        evaluateStall(room);
        // Only on change: the roster shows who is loading.
        if (was !== room.buffering.has(m)) sendControl(room);
        return;
      }
      case 'chat':
        // The name given at join, not one per message, so nobody can post as someone else.
        broadcast(room, { type: 'chat', name: m.name, text: msg.text }, m);
        return;
      case 'signal':
        // The call is peer-to-peer, designed for two people; the server only relays.
        broadcast(room, { type: 'signal', from: m.id, description: msg.description, candidate: msg.candidate, bye: msg.bye }, m);
        return;
      case 'reaction':
        broadcast(room, { type: 'reaction', emoji: msg.emoji }, m);
        return;
      case 'queue-add':
        if (room.queue.length >= LIMITS.queue) return;
        room.queue.push(msg.src);
        sendQueue(room);
        return;
      case 'queue-remove':
        if (msg.index < room.queue.length) room.queue.splice(msg.index, 1);
        sendQueue(room);
        return;
      case 'ready-check': {
        // Only from a paused room with something loaded, and one question at a time.
        if (!s.src || !s.paused || room.readyCheck) return;
        const waiting = new Set([...room.clients].map((c) => c.clientId).filter((id) => id !== m.clientId));
        room.readyCheck = { by: m.name, waiting, timer: clock.setTimeout(() => endReadyCheck(room, false), t.readyTimeoutMs) };
        maybeStartReadyCheck(room);
        return;
      }
      case 'ready':
        if (!room.readyCheck) return;
        room.readyCheck.waiting.delete(m.clientId);
        maybeStartReadyCheck(room);
        return;
      case 'ready-cancel':
        endReadyCheck(room, false);
        return;
      case 'ended':
        // Everyone's player reports the end; the first report for the current film advances.
        if (msg.src !== s.src || !room.queue.length) return;
        s.src = room.queue.shift() ?? null;
        s.paused = false;
        s.position = 0;
        room.buffering.clear();
        sendQueue(room);
        break;
      case 'src':
        s.src = msg.src;
        s.paused = true;
        s.position = 0;
        // Everyone reloads; old "still loading" reports were about the previous file.
        room.buffering.clear();
        break;
      case 'play':
        s.paused = false;
        s.position = msg.position;
        break;
      case 'pause':
        s.paused = true;
        s.position = msg.position;
        break;
      case 'seek':
        s.position = msg.position;
        break;
      default:
        return;
    }
    commit(room, msg.type);
  }

  // Running rooms re-send their anchor now and then, so a client that missed a message catches up.
  function tick() {
    for (const room of rooms.values()) {
      if (!room.state.paused && !room.state.stalled) broadcast(room, stateMsg(room, 'tick'));
    }
  }

  /** What survives a restart. @param {Room} room @returns {Snapshot} */
  const snapshot = (room) => ({
    src: room.state.src,
    position: Math.round(currentPosition(room.state, clock.now()) * 10) / 10,
    controlMode: room.controlMode,
    hostClientId: room.hostClientId,
    queue: room.queue,
  });

  const isWatching = (src) => [...rooms.values()].some((r) => r.state.src === src && r.clients.size > 0);

  return { rooms, handle, join, leave, tick, snapshot, isWatching };
}
