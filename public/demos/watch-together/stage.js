// Fullscreen and pop-out. Fullscreen applies to the whole stage, not the <video>, so the call,
// reactions and chat can float over the movie. The call panel moves between three homes: the side
// column, a draggable bubble on the fullscreen stage, or its own always-on-top Picture-in-Picture window.
import { $, video, stage, setStatus, setIcon } from './ui.js';
import { remoteVideo, selfVideo } from './call.js';

const callBox = $('call');
const callHome = callBox.parentNode;
const fsCall = $('fsCall');
/** @type {Window | null} */
let pipWin = null;

export function isStageFullscreen() {
  return document.fullscreenElement === stage;
}

// In fullscreen the chat panel is hidden, so the other person's messages surface over the movie.
export function toast(name, text) {
  const t = document.createElement('div');
  t.className = 'toast';
  const who = document.createElement('b');
  who.textContent = `${name}: `;
  t.append(who, document.createTextNode(text));
  t.addEventListener('animationend', () => t.remove());
  $('toasts').append(t);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
}

function placeCall() {
  const target = pipWin ? pipWin.document.body : isStageFullscreen() ? fsCall : null;
  if (target) {
    if (callBox.parentNode !== target) target.append(callBox);
  } else if (callBox.parentNode !== callHome) {
    callHome.prepend(callBox);
  }
  fsCall.hidden = !isStageFullscreen() || !!pipWin;
  $('popoutBtn').textContent = pipWin ? 'Pop in' : 'Pop out';
  // Re-parenting a <video> can pause it.
  for (const v of [remoteVideo, selfVideo]) if (v.srcObject) v.play().catch(() => {});
}

export function toggleFullscreen() {
  if (isStageFullscreen()) document.exitFullscreen().catch(() => {});
  else stage.requestFullscreen().catch((err) => setStatus(`Fullscreen failed: ${err.message}`));
}
document.addEventListener('fullscreenchange', () => {
  // Some browsers ignore controlslist="nofullscreen" and fullscreen the bare <video>, which
  // hides the call. Swap to the stage: switching the fullscreen element is usually allowed
  // without a fresh click; if not, the hint says what to use instead.
  if (document.fullscreenElement === video) {
    stage.requestFullscreen().catch(() => setStatus('Use ⛶ Fullscreen (or press F) to keep the call visible'));
    return;
  }
  placeCall();
  setIcon($('fsBtn'), isStageFullscreen() ? '#i-exitfull' : '#i-full');
  $('fsBtn').setAttribute('aria-label', isStageFullscreen() ? 'Exit fullscreen' : 'Fullscreen');
  wake();
});
$('fsBtn').onclick = toggleFullscreen;

// Hide the controls and cursor after a few seconds of playback without movement. Never while
// paused, typing, or pointing at the controls.
let idleTimer = null;
let overControls = false;
export function wake() {
  stage.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!video.paused && !overControls && document.activeElement !== $('fsChatInput')) stage.classList.add('idle');
  }, 3000);
}
stage.addEventListener('pointermove', wake);
stage.addEventListener('pointerdown', wake);
video.addEventListener('play', wake);
video.addEventListener('pause', wake);
for (const id of ['controls', 'fsBar', 'trackMenu']) {
  $(id).addEventListener('pointerenter', () => (overControls = true));
  $(id).addEventListener('pointerleave', () => {
    overControls = false;
    wake();
  });
}

// Drag the call bubble anywhere on the stage; the bottom-right corner is the resize grip.
fsCall.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  const box = fsCall.getBoundingClientRect();
  if (box.right - e.clientX < 18 && box.bottom - e.clientY < 18) return;
  e.preventDefault();
  const area = stage.getBoundingClientRect();
  const dx = e.clientX - box.left;
  const dy = e.clientY - box.top;
  fsCall.setPointerCapture(e.pointerId);
  const move = (ev) => {
    const x = Math.min(Math.max(0, ev.clientX - area.left - dx), area.width - box.width);
    const y = Math.min(Math.max(0, ev.clientY - area.top - dy), area.height - box.height);
    Object.assign(fsCall.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
  };
  const up = () => {
    fsCall.removeEventListener('pointermove', move);
    fsCall.removeEventListener('pointerup', up);
  };
  fsCall.addEventListener('pointermove', move);
  fsCall.addEventListener('pointerup', up);
});

// Pop out: Document Picture-in-Picture keeps the whole call panel (videos and buttons) in a
// small window that stays on top of other apps, like Discord's pop-out. Chromium only;
// elsewhere fall back to classic PiP of the other person's video.
async function togglePopout() {
  if (pipWin) return pipWin.close();
  if ('documentPictureInPicture' in window) {
    try {
      const w = await /** @type {any} */ (window).documentPictureInPicture.requestWindow({ width: 380, height: 300 });
      // The new window starts blank: copy our styles across.
      for (const sheet of document.styleSheets) {
        try {
          const style = w.document.createElement('style');
          style.textContent = [...sheet.cssRules].map((r) => r.cssText).join('\n');
          w.document.head.append(style);
        } catch {}
      }
      w.document.title = 'Watch Together call';
      w.document.body.classList.add('pip');
      pipWin = w;
      w.addEventListener('pagehide', () => {
        pipWin = null;
        placeCall();
      });
      placeCall();
    } catch (err) {
      setStatus(`Pop-out failed: ${err.message}`);
    }
  } else if (document.pictureInPictureEnabled && remoteVideo.srcObject) {
    remoteVideo.requestPictureInPicture().catch((err) => setStatus(`Pop-out failed: ${err.message}`));
  } else {
    setStatus('Pop-out needs a call in progress (full pop-out works in Chrome, Edge and Arc)');
  }
}
$('popoutBtn').onclick = togglePopout;
