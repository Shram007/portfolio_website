// Voice/video call: peer-to-peer WebRTC (two people), signaled over the room socket.
// Uses the "perfect negotiation" pattern so both sides can add tracks at any time.
import { $, initial, setStatus } from './ui.js';
import { S, send } from './state.js';

export const remoteVideo = $('remoteVideo');
export const selfVideo = $('selfVideo');
let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
fetch('/api/ice')
  .then((r) => r.json())
  .then((s) => (iceServers = s))
  .catch(() => {});

let peerCount = 0;
/** @type {RTCPeerConnection | null} */
let pc = null;
/** @type {MediaStream | null} */
let localStream = null;
let makingOffer = false;
let ignoreOffer = false;
// Name of the other person in the room, for the call's empty state.
let callPartner = null;

function attachLocal(p) {
  for (const track of localStream.getTracks()) p.addTrack(track, localStream);
}

function ensurePc() {
  if (pc) return pc;
  const p = new RTCPeerConnection({ iceServers });
  pc = p;
  p.ontrack = ({ streams }) => {
    if (streams[0]) remoteVideo.srcObject = streams[0];
    updateCallEmpty();
  };
  p.onicecandidate = ({ candidate }) => candidate && send({ type: 'signal', candidate });
  p.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      await p.setLocalDescription();
      send({ type: 'signal', description: p.localDescription });
    } catch (err) {
      console.warn('negotiation failed', err);
    } finally {
      makingOffer = false;
    }
  };
  if (localStream) attachLocal(p);
  return p;
}

// Drop the peer connection; rebuild it right away if we're in a call so we re-offer.
function resetPc() {
  if (pc) pc.close();
  pc = null;
  makingOffer = false;
  ignoreOffer = false;
  remoteVideo.srcObject = null;
  updateCallEmpty();
  if (localStream) ensurePc();
}

/** A new socket: signaling was lost, so any old peer connection is stale. */
export function resetCall() {
  peerCount = 0;
  resetPc();
}

function updateCallEmpty() {
  $('callEmpty').hidden = !!remoteVideo.srcObject;
}

export function onPeers(n) {
  if (n !== peerCount) {
    peerCount = n;
    resetPc();
  }
}

export async function handleSignal({ from, description, candidate, bye }) {
  if (bye) return resetPc();
  const p = ensurePc();
  // Lower id yields on offer collisions.
  const polite = S.myId < from;
  try {
    if (description) {
      const collision = description.type === 'offer' && (makingOffer || p.signalingState !== 'stable');
      ignoreOffer = !polite && collision;
      if (ignoreOffer) return;
      await p.setRemoteDescription(description);
      if (description.type === 'offer') {
        await p.setLocalDescription();
        send({ type: 'signal', description: p.localDescription });
      }
    } else if (candidate) {
      try {
        await p.addIceCandidate(candidate);
      } catch (err) {
        if (!ignoreOffer) throw err;
      }
    }
  } catch (err) {
    console.warn('signal failed', err);
  }
}

export function setCallPartner(name) {
  callPartner = name;
  renderCallEmpty();
}

// Before a call: invite to start one. In a call with nobody connected yet: say who we're waiting on.
function renderCallEmpty() {
  $('callEmptyAvatar').textContent = callPartner ? initial(callPartner) : '♥';
  $('callEmptyText').textContent = localStream
    ? callPartner
      ? `Waiting for ${callPartner} to join the call…`
      : 'Waiting for your person…'
    : callPartner
      ? `Start a call to see ${callPartner}`
      : 'Start a call to see each other';
}

function setCallUi(active) {
  $('callStart').hidden = active;
  for (const id of ['micBtn', 'camBtn', 'callEnd']) $(id).hidden = !active;
  $('micBtn').textContent = 'Mute';
  $('camBtn').textContent = 'Camera off';
  $('micBtn').classList.remove('off');
  $('camBtn').classList.remove('off');
}

$('callStart').onclick = async () => {
  if (localStream) return;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (err) {
    setStatus(`Mic/cam unavailable: ${err.name}`);
    return;
  }
  selfVideo.srcObject = localStream;
  selfVideo.setAttribute('data-live', '');
  setCallUi(true);
  renderCallEmpty();
  // An incoming offer may already have created the connection.
  if (pc) attachLocal(pc);
  else ensurePc();
};

function toggleTracks(tracks, btn, onLabel, offLabel) {
  const enable = !tracks[0]?.enabled;
  tracks.forEach((t) => (t.enabled = enable));
  btn.textContent = enable ? onLabel : offLabel;
  btn.classList.toggle('off', !enable);
}
$('micBtn').onclick = () => toggleTracks(localStream.getAudioTracks(), $('micBtn'), 'Mute', 'Unmute');
$('camBtn').onclick = () => toggleTracks(localStream.getVideoTracks(), $('camBtn'), 'Camera off', 'Camera on');

$('callEnd').onclick = () => {
  if (!localStream) return;
  localStream.getTracks().forEach((t) => t.stop());
  localStream = null;
  selfVideo.srcObject = null;
  selfVideo.removeAttribute('data-live');
  send({ type: 'signal', bye: true });
  resetPc();
  setCallUi(false);
  renderCallEmpty();
};
