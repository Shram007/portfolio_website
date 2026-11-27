// Resumable upload. The file is sent in chunks; if the tab closes or the network drops,
// choosing the same file again resumes from the chunks the server already has.
import { $, stage, api, setStatus, prettyTitle } from './ui.js';
import { loadFiles } from './library.js';

const UPLOAD_WORKERS = 3;
const uploadKey = (f) => `wt-upload:${f.name}:${f.size}:${f.lastModified}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sha256Hex(buf) {
  // crypto.subtle only exists on https/localhost; the checksum is optional for the server.
  if (!crypto.subtle) return null;
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function startOrResume(file) {
  let id = null;
  try {
    id = localStorage.getItem(uploadKey(file));
  } catch {}
  if (id) {
    try {
      return await api('GET', `/api/uploads/${id}`);
    } catch {}
  }
  const info = await api('POST', '/api/uploads', { name: file.name, size: file.size });
  try {
    localStorage.setItem(uploadKey(file), info.id);
  } catch {}
  return info;
}

/** @param {File | undefined} file */
async function uploadFile(file) {
  if (!file) return;
  let info;
  try {
    info = await startOrResume(file);
  } catch (err) {
    return setStatus(`Upload failed: ${err.message}`);
  }
  const have = new Set(info.received);
  const todo = [];
  for (let i = 0; i < info.totalChunks; i++) if (!have.has(i)) todo.push(i);
  let sent = info.received.length;
  if (sent) setStatus(`Resuming upload at ${Math.round((sent / info.totalChunks) * 100)}%`);

  // Set when any worker hits a fatal error, so the others stop instead of uploading on.
  let aborted = false;

  async function sendChunk(i) {
    const blob = file.slice(i * info.chunkSize, Math.min(file.size, (i + 1) * info.chunkSize));
    const buf = await blob.arrayBuffer();
    const sum = await sha256Hex(buf);
    for (let attempt = 0; ; attempt++) {
      if (aborted) return;
      try {
        const res = await fetch(`/api/uploads/${info.id}/chunks/${i}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/octet-stream', ...(sum ? { 'x-chunk-sha256': sum } : {}) },
          body: buf,
        });
        if (res.ok) return;
        // 4xx other than a checksum mismatch won't fix itself by retrying.
        if (res.status >= 400 && res.status < 500 && res.status !== 422) {
          throw Object.assign(new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`), { fatal: true });
        }
      } catch (err) {
        if (err.fatal || attempt >= 6) throw err;
      }
      await sleep(Math.min(30000, 1000 * 2 ** attempt));
    }
  }

  try {
    await Promise.all(
      Array.from({ length: UPLOAD_WORKERS }, async () => {
        try {
          while (todo.length && !aborted) {
            await sendChunk(todo.shift());
            if (aborted) return;
            sent++;
            setStatus(`Uploading ${file.name} ${Math.round((sent / info.totalChunks) * 100)}%`);
          }
        } catch (err) {
          aborted = true;
          throw err;
        }
      })
    );
    const result = await api('POST', `/api/uploads/${info.id}/complete`);
    try {
      localStorage.removeItem(uploadKey(file));
    } catch {}
    await loadFiles();
    setStatus(
      result.status === 'ready'
        ? `${prettyTitle(result.name)} is in the library. Press Play to start it for both of you.`
        : `Uploaded. Converting ${prettyTitle(result.name)} so every browser can play it.`
    );
  } catch (err) {
    // A 4xx means the server rejected the file itself; resuming would only repeat it.
    // 409 (chunks missing) is the exception: resuming is exactly the fix.
    if (err.status >= 400 && err.status < 500 && err.status !== 409) {
      try {
        localStorage.removeItem(uploadKey(file));
      } catch {}
      setStatus(`Upload failed: ${err.message}`);
    } else {
      setStatus(`Upload paused: ${err.message}. Choose the same file again to resume.`);
    }
  }
}

$('uploadBtn').onclick = () => $('uploadInput').click();
$('uploadInput').onchange = (e) => {
  uploadFile(e.target.files[0]);
  e.target.value = '';
};

// Drag a file onto the player or the library's drop zone to upload.
for (const zone of [stage, $('dropZone')]) {
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drop');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drop'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drop');
    uploadFile(e.dataTransfer.files[0]);
  });
}
