// The library drawer (films, conversions, storage), the "up next" queue and the "ready?" card.
import { $, el, api, setStatus, actionButton, prettyTitle, formatBytes, formatDuration } from './ui.js';
import { S, send, locked, deny } from './state.js';
import { pickSubtitleFile } from './tracks.js';

let libraryFiles = [];
let lastJobs = [];

export async function loadFiles() {
  let lib;
  try {
    lib = await api('GET', '/api/library');
  } catch {
    return;
  }
  libraryFiles = lib.files;
  renderFiles();
  const n = lib.files.length;
  const engine = lib.converter ? ` · converts on ${lib.converter === 'h264_nvenc' ? 'your GPU' : 'the CPU'}` : '';
  $('storage').textContent = `${n} movie${n === 1 ? '' : 's'} · ${formatBytes(lib.bytes)} used · ${formatBytes(lib.free)} free${engine}`;
  showJobs(lib.jobs);
}

export function renderFiles() {
  const list = $('fileList');
  if (!libraryFiles.length) {
    list.replaceChildren(el('li', 'meta', 'No movies yet. Upload one to get started.'));
    return;
  }
  list.replaceChildren(
    ...libraryFiles.map((f) => {
      const li = el('li', `file${f.name === S.currentSrc ? ' current' : ''}`);
      const title = el('div', 'title', prettyTitle(f.name));
      if (f.name === S.currentSrc) title.append(el('span', 'badge', 'Now showing'));
      if (!f.playable) title.append(el('span', 'badge warn', 'Needs converting'));
      if (f.adaptive) title.append(el('span', 'badge', 'Adaptive'));
      const meta = el(
        'div',
        'meta',
        [f.name, f.video && `${f.video} / ${f.audio || 'no audio'}`, formatDuration(f.duration), formatBytes(f.size)].filter(Boolean).join(' · ')
      );
      const actions = el('div', 'actions');
      actions.append(
        f.playable ? actionButton('Play', 'primary', () => loadFile(f.name)) : actionButton('Convert', '', () => convertFile(f.name)),
        actionButton('Delete', 'ghost del', () => deleteFile(f.name))
      );
      li.append(title, actions, meta);
      if (f.playable) {
        const more = el('div', 'more');
        more.append(actionButton('+ Up next', 'ghost', () => addToQueue(f.name)), actionButton('+ Subtitles', 'ghost', () => pickSubtitleFile(f.name)));
        const preparing = lastJobs.some((j) => j.kind === 'hls' && j.name === f.name && (j.status === 'queued' || j.status === 'converting'));
        if (!f.adaptive && !preparing) more.append(actionButton('Make adaptive', 'ghost', () => makeAdaptive(f.name)));
        li.append(more);
      }
      return li;
    })
  );
}

export function showJobs(jobs) {
  const wasPreparing = lastJobs.map((j) => `${j.id}:${j.status}`).join();
  lastJobs = jobs;
  if (wasPreparing !== jobs.map((j) => `${j.id}:${j.status}`).join()) renderFiles();
  $('jobsList').replaceChildren(
    ...jobs.map((j) => {
      const row = el('div', `job${j.status === 'failed' ? ' failed' : ''}`);
      const what = j.kind === 'hls' ? 'Making adaptive' : 'Converting';
      const label =
        j.status === 'converting'
          ? `${what} ${prettyTitle(j.name)} · ${Math.round(j.progress * 100)}%`
          : j.status === 'queued'
            ? `Queued: ${prettyTitle(j.name)}`
            : j.status === 'failed'
              ? `Couldn't finish ${prettyTitle(j.name)}: ${j.error}`
              : `Ready: ${prettyTitle(j.name)}${j.kind === 'hls' ? ' (adaptive)' : ''}`;
      row.append(el('div', null, label));
      if (j.status === 'converting') {
        const bar = el('progress');
        bar.max = 1;
        bar.value = j.progress;
        row.append(bar);
      }
      return row;
    })
  );
  const active = jobs.find((j) => j.status === 'converting');
  $('convBadge').textContent = active ? `${active.kind === 'hls' ? 'Preparing' : 'Converting'} ${Math.round(active.progress * 100)}%` : '';
}

function loadFile(name) {
  if (locked()) return deny();
  send({ type: 'src', src: name });
  $('library').close();
  setStatus(`Loading ${prettyTitle(name)} for both of you`);
}

async function convertFile(name) {
  try {
    await api('POST', `/api/library/${encodeURIComponent(name)}/convert`);
    setStatus(`Converting ${prettyTitle(name)}. You can keep watching meanwhile.`);
  } catch (err) {
    setStatus(`Couldn't convert: ${err.message}`);
  }
}

async function makeAdaptive(name) {
  try {
    await api('POST', `/api/library/${encodeURIComponent(name)}/adaptive`);
    setStatus(`Making an adaptive version of ${prettyTitle(name)}. It plays smoother on slow connections.`);
  } catch (err) {
    setStatus(`Couldn't start: ${err.message}`);
  }
}

async function deleteFile(name) {
  if (!confirm(`Delete "${prettyTitle(name)}"? This removes the file from your computer.`)) return;
  try {
    await api('DELETE', `/api/library/${encodeURIComponent(name)}`);
  } catch (err) {
    setStatus(`Couldn't delete: ${err.message}`);
  }
}

export function openLibrary() {
  if (!$('library').open) $('library').showModal();
  loadFiles();
}
$('libraryBtn').onclick = openLibrary;
$('emptyLibraryBtn').onclick = openLibrary;
$('libClose').onclick = () => $('library').close();
// Clicking the dimmed backdrop closes the drawer.
$('library').addEventListener('click', (e) => {
  if (e.target === $('library')) $('library').close();
});

// ---- Up next ----
export function updateNowShowing() {
  const parts = S.currentSrc ? ['Now showing · ', el('em', null, prettyTitle(S.currentSrc))] : [];
  if (S.queue[0]) parts.push(` · Up next: ${prettyTitle(S.queue[0])}`);
  $('nowShowing').replaceChildren(...parts);
}

export function renderQueue() {
  $('queueBox').hidden = !S.queue.length;
  $('queueList').replaceChildren(
    ...S.queue.map((name, i) => {
      const li = el('li');
      const row = el('div');
      row.append(el('span', null, prettyTitle(name)), actionButton('Remove', 'ghost', () => (locked() ? deny() : send({ type: 'queue-remove', index: i }))));
      li.append(row);
      return li;
    })
  );
  updateNowShowing();
}

function addToQueue(name) {
  if (locked()) return deny();
  send({ type: 'queue-add', src: name });
  setStatus(`${prettyTitle(name)} is up next. It starts when this one ends.`);
}

// ---- "Ready?" check ----
// Someone asks; the movie starts for everyone the moment the last person says yes.
$('readyBtn').onclick = () => {
  if (locked()) return deny();
  send({ type: 'ready-check' });
};

export function renderReadyCheck(msg) {
  S.readyActive = msg.active;
  const card = $('readyCard');
  card.hidden = !msg.active;
  if (!msg.active) return card.replaceChildren();
  const row = el('div', 'row');
  if (msg.mine) {
    row.append(actionButton("I'm ready", 'primary', () => send({ type: 'ready' })), actionButton('Not yet', 'ghost', () => send({ type: 'ready-cancel' })));
    card.replaceChildren(el('h3', null, `${msg.by} is ready to start`), el('p', null, 'Popcorn? Lights? Say when.'), row);
  } else {
    row.append(actionButton('Cancel', 'ghost', () => send({ type: 'ready-cancel' })));
    card.replaceChildren(el('h3', null, 'Ready?'), el('p', null, `Waiting for ${msg.waiting.join(' and ') || 'everyone'}…`), row);
  }
}
