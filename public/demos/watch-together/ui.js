// Small DOM and formatting helpers used across the page. No state lives here.

/** @returns {any} */
export const $ = (id) => document.getElementById(id);
/** @type {HTMLVideoElement} */
export const video = $('video');
export const stage = $('stage');

/** @param {string} tag @param {string | null} [cls] @param {string | null} [text] @returns {any} */
export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// Transient notices (errors, upload progress, hints) slide up at the bottom and fade out.
let noticeTimer = null;
export function setStatus(text) {
  const n = $('notice');
  n.textContent = text;
  n.classList.add('show');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => n.classList.remove('show'), 5000);
}

export function actionButton(label, cls, onclick) {
  const b = el('button', cls, label);
  b.type = 'button';
  b.onclick = onclick;
  return b;
}

export function setIcon(btn, id) {
  btn.querySelector('use').setAttribute('href', id);
}

export const initial = (name) => (Array.from(String(name || '?').trim())[0] || '?').toUpperCase();

// "About.Time.2013.1080p-h264.mp4" -> "About Time 2013 1080p"
export const prettyTitle = (name) =>
  String(name).replace(/\.[^.]+$/, '').replace(/-h264$/i, '').replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim();

export function formatBytes(n) {
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function formatDuration(s) {
  if (!s) return '';
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
}

/** JSON request; throws with the server's error message on a non-2xx answer. */
export async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data });
  return data;
}
