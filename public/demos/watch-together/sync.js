// Pure playback-sync helpers, shared by the browser client and the Node tests.

// Drift control: proportional with a dead zone, after OpenWatchParty and Syncplay.
export const DEAD_ZONE = 0.04; // closer than this counts as in sync
export const ENTER_ZONE = 0.15; // start correcting only past this; stop at DEAD_ZONE (hysteresis)
export const GAIN = 0.15; // rate offset = GAIN * sqrt(|drift|): 0.15 s -> ~1.06x, 1 s -> 1.15x
export const RATE_MIN = 0.9;
export const RATE_MAX = 1.15;
export const HARD_SEEK = 2; // past this, jump instead of nudging

// Seconds buffered ahead of the room position: below READY_AHEAD a player is short of data, and
// once short it only counts as ready again at RESUME_AHEAD. Resuming on the bare minimum on a slow
// link means stopping again a few seconds later; the cushion turns stop-start into one longer wait.
export const READY_AHEAD = 2;
export const RESUME_AHEAD = 10;

/** Whether a player that has `ahead` seconds loaded should report itself short of data. */
export function shortOfData(ahead, wasShort) {
  return ahead < (wasShort ? RESUME_AHEAD : READY_AHEAD);
}

/**
 * What to do about the gap between where the room is and where this player is.
 * `correcting` is whether a rate correction is already running, so correction
 * starts at ENTER_ZONE but only stops at DEAD_ZONE instead of flapping on one line.
 */
export function computeCorrection(target, actual, correcting) {
  const drift = target - actual; // > 0: behind the room, speed up
  const abs = Math.abs(drift);
  if (abs >= HARD_SEEK) return { kind: 'seek', to: target };
  if (abs < (correcting ? DEAD_ZONE : ENTER_ZONE)) return { kind: 'none' };
  const rate = 1 + Math.sign(drift) * GAIN * Math.sqrt(abs);
  return { kind: 'rate', rate: Math.min(RATE_MAX, Math.max(RATE_MIN, rate)) };
}

// Catching up after falling behind a running room: jump this far past the room's position and
// hold there while it loads, so the room comes to us instead of us chasing it with fresh seeks.
export const CATCH_UP_LEAD = 4;
export const CATCH_UP_LEAD_MAX = 30;
// Needing another catch-up this soon after the last one means the lead was too short.
export const CATCH_UP_RETRY_MS = 15_000;

/** Lead for the next catch-up: double it if the last one only just ended, else start small. */
export function nextCatchUpLead(prevLead, msSinceLast) {
  return msSinceLast < CATCH_UP_RETRY_MS ? Math.min(CATCH_UP_LEAD_MAX, prevLead * 2) : CATCH_UP_LEAD;
}

/** Total seconds downloaded across every range: grows whenever the download makes progress. */
export function bufferedTotal(ranges) {
  let total = 0;
  for (let i = 0; i < ranges.length; i++) total += ranges.end(i) - ranges.start(i);
  return total;
}

/**
 * Contiguous seconds downloaded from `t` onwards (0 if `t` is outside every range).
 * Takes anything shaped like TimeRanges so it can be tested without a DOM.
 */
export function bufferedAhead(ranges, t) {
  for (let i = 0; i < ranges.length; i++) {
    // Small tolerance so a position exactly on a range start doesn't read as unbuffered.
    if (ranges.start(i) - 0.1 <= t && t < ranges.end(i)) return ranges.end(i) - t;
  }
  return 0;
}

/**
 * Room position at `serverNow` (milliseconds on the server's clock). The state is an anchor:
 * `position` at time `updatedAt`. A future `updatedAt` is a scheduled start, so the position
 * holds until then and every client begins on the same instant.
 */
export function targetPosition(state, serverNow) {
  if (state.paused || state.stalled) return state.position;
  return state.position + Math.max(0, serverNow - state.updatedAt) / 1000;
}

export const CLOCK_SAMPLES = 8;
export const CLOCK_ALPHA = 0.3;

/**
 * NTP-style clock sync. Each sample is {rtt, offset}, where offset = server_ts + rtt/2 - now.
 * The lowest-RTT sample in the window suffered the least queueing, so it's the one to trust;
 * an EMA keeps a single lucky sample from jerking the estimate. Mutates `samples`.
 * Returns the new offset to add to Date.now() to get server time.
 */
export function updateClock(samples, offset, sample) {
  samples.push(sample);
  if (samples.length > CLOCK_SAMPLES) samples.shift();
  const best = samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
  return offset === null ? best.offset : offset * (1 - CLOCK_ALPHA) + best.offset * CLOCK_ALPHA;
}
