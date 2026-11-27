/* Job dashboard demo: stands in for jobscan/serve.py in the browser.

   The page is the real dashboard template with made-up roles (tools/demo/build.py).
   This file loads before the page's own script and gives it what serve.py would:
   window.__BOOT__, the DS state store (kept in this browser's localStorage, under its
   own prefix) and answers to the page's /api/ calls. Nothing leaves the browser: other
   requests are refused, and links to the made-up postings show a note instead. */
(function () {
  'use strict';
  const D = window.__DEMO__;
  const PREFIX = 'jsdemo:';
  const META = 'jsdemo-meta';
  const FRESH_DAYS = 3;
  const DAY = 864e5;

  // ── Dates: the data was made on D.builtOn; move it to today so "3d ago" stays true. ──
  function localMidnight(ymd) { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d); }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const SHIFT = Math.round((today - localMidnight(D.builtOn)) / DAY);
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function shiftDate(s) { if (!s || !SHIFT) return s; const d = localMidnight(s.slice(0, 10)); d.setDate(d.getDate() + SHIFT); return ymd(d); }
  function shiftIso(s) { const t = Date.parse(s); return !s || isNaN(t) || !SHIFT ? s : new Date(t + SHIFT * DAY).toISOString(); }
  const daysAgo = (s) => { if (!s) return null; return Math.round((today - localMidnight(s.slice(0, 10))) / DAY); };

  // ── State store: localStorage semantics, like serve.py's DS, kept in this browser. ──
  let mem = null;  // used when storage is blocked (private window, previews)
  function ownKeys() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX)) out.push(k); }
    return out;
  }
  function resetStore() { try { ownKeys().forEach(k => localStorage.removeItem(k)); } catch (e) { /* blocked */ } mem = mem && {}; }
  try {
    const m = JSON.parse(localStorage.getItem(META) || 'null');
    // A fresh demo for a new build, or after a few days, so the made-up dates stay sensible.
    if (!m || m.builtOn !== D.builtOn || Date.now() - m.started > FRESH_DAYS * DAY) {
      resetStore();
      localStorage.setItem(META, JSON.stringify({ builtOn: D.builtOn, started: Date.now() }));
    }
  } catch (e) { mem = {}; }
  const get = (k) => { if (mem) return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; try { return localStorage.getItem(PREFIX + k); } catch (e) { return null; } };
  const set = (k, v) => { if (mem) { mem[k] = String(v); return; } try { localStorage.setItem(PREFIX + k, String(v)); } catch (e) { mem = {}; mem[k] = String(v); } };
  const del = (k) => { if (mem) { delete mem[k]; return; } try { localStorage.removeItem(PREFIX + k); } catch (e) { /* blocked */ } };
  function keys() { if (mem) return Object.keys(mem); try { return ownKeys().map(k => k.slice(PREFIX.length)); } catch (e) { return []; } }
  window.DS = {
    getItem: get, setItem: set, removeItem: del,
    clear: () => keys().forEach(del),
    key: (i) => keys()[i] === undefined ? null : keys()[i],
    get length() { return keys().length; },
    _flushNow: () => Promise.resolve(),
  };
  // The sync prompt asks for a token the demo has no use for, and the Connections
  // tab would open empty, so both start the way a set-up dashboard looks.
  set('jobdash_syncbanner_hidden_v1', '1');
  if (get('jobdash_connections_v2') === null && D.connections) set('jobdash_connections_v2', JSON.stringify(D.connections));

  // ── Boot data, as serve.py would inject it ──
  const boot = JSON.parse(JSON.stringify(D.boot));
  boot.servedAt = Date.now();
  boot.tailored.forEach(r => { r.mtime = shiftIso(r.mtime); });
  window.__BOOT__ = boot;
  const JOB_URLS = new Set(Object.keys(boot.matchScores));

  // Tailoring runs started in this demo, and the made-up PDFs they "produce".
  const RUNS_KEY = 'demo_tailor_runs';
  const MADE_KEY = 'demo_tailored';
  const load = (k, dflt) => { try { return JSON.parse(get(k) || 'null') || dflt; } catch (e) { return dflt; } };
  function seedRuns() {
    const t = boot.tailored[0];
    return t ? [{ id: 'demo-1', url: '', company: t.company, title: 'AI Engineer', mode: 'cloud', coverLetter: false,
      startedAt: new Date(Date.parse(t.mtime) - 40 * 60e3).toISOString(), status: 'done', files: [t.path], estCost: 2 }] : [];
  }
  const runs = () => load(RUNS_KEY, null) || seedRuns();
  const made = () => load(MADE_KEY, []);
  const allTailored = () => boot.tailored.concat(made());

  // ── Helpers that reach into the page's own globals once it has loaded ──
  const pageJobs = () => { try { return allJobs; } catch (e) { return []; } };           // eslint-disable-line no-undef
  const pageRemoved = () => { try { return removedUrls; } catch (e) { return new Set(); } }; // eslint-disable-line no-undef
  const pageAsks = () => { try { return ASKS; } catch (e) { return {}; } };               // eslint-disable-line no-undef
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const sameCo = (a, b) => norm(a) && norm(a) === norm(b);
  function note(msg) {
    try { if (typeof showToast === 'function') { showToast(msg); return; } } catch (e) { /* not loaded yet */ } // eslint-disable-line no-undef
    console.info('[demo]', msg);
  }
  function refreshPage() {
    try { if (typeof loadTailorRuns === 'function') loadTailorRuns(); } catch (e) { /* not loaded */ } // eslint-disable-line no-undef
  }

  // ── Apply next: the ranked list from apply_queue.build_queue, re-filtered after the visitor's clicks ──
  function queue(limit, minutes) {
    const byUrl = new Map(pageJobs().map(j => [j.url, j]));
    const removed = pageRemoved();
    const asks = pageAsks();
    const tailored = allTailored();
    const items = [];
    for (const it of D.queue.items) {
      const j = byUrl.get(it.url);
      if (!j || (j.status || 'pending') !== 'pending' || removed.has(it.url)) continue;
      const resumes = tailored.filter(r => r.kind === 'resume' && sameCo(r.company, it.company)).map(r => r.path);
      const q = Object.assign({}, it, { id: j.id, resumes, postedDate: j.postedDate || it.postedDate, ageDays: daysAgo(j.postedDate) });
      if (it.action === 'ask' && asks[it.company]) {
        q.action = 'apply';
        q.reasons = ['referral asked today'].concat(it.reasons.slice(1));
        q.estMinutes = it.applyMinutes;
      }
      if (!it.resumes.length && resumes.length && q.action === 'apply') {
        q.estMinutes = Math.max(1, q.estMinutes - D.queue.minutesToTailor);
      }
      items.push(q);
    }
    const per = {};
    const capped = items.filter(i => { const k = norm(i.company); per[k] = (per[k] || 0) + 1; return per[k] <= D.queue.perCompanyCap; });
    if (minutes) {
      const out = []; let used = 0;
      for (const i of capped) if (used + i.estMinutes <= minutes) { out.push(i); used += i.estMinutes; }
      return limit ? out.slice(0, limit) : out;
    }
    const ref = capped.filter(i => i.group === 'referral');
    const oth = capped.filter(i => i.group !== 'referral');
    if (!limit) return ref.concat(oth);
    const half = Math.floor((limit + 1) / 2);
    const nRef = Math.min(ref.length, Math.max(half, limit - oth.length));
    return ref.slice(0, nRef).concat(oth.slice(0, limit - nRef));
  }

  // ── Tailoring: a run "finishes" after a few seconds with a made-up PDF name ──
  function startTailor(body) {
    const j = pageJobs().find(x => x.url === body.url);
    if (!j) return { ok: false, error: 'job not found' };
    const list = runs();
    if (list.some(r => r.url === j.url && r.status !== 'done')) return { ok: false, error: 'already tailoring this role' };
    const rec = { id: 'demo-' + Date.now(), url: j.url, company: j.company, title: j.title || '', mode: body.mode || 'local',
      coverLetter: !!body.coverLetter, startedAt: new Date().toISOString(), status: 'running', files: [],
      estCost: body.mode === 'cloud' ? 2 : 0 };
    list.push(rec);
    set(RUNS_KEY, JSON.stringify(list));
    const step = (status, files) => {
      const l = runs(); const r = l.find(x => x.id === rec.id); if (!r) return;
      r.status = status; if (files) r.files = files;
      set(RUNS_KEY, JSON.stringify(l));
      refreshPage();
    };
    if (rec.mode === 'cloud') setTimeout(() => step('in-cloud'), 2500);
    setTimeout(() => {
      const role = (j.title || 'SWE').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const path = 'YourName_' + j.company.replace(/[^A-Za-z0-9]+/g, '_') + '_' + role + '.pdf';
      const files = [path];
      const m = made();
      m.push({ company: j.company, role, kind: 'resume', path, mtime: new Date().toISOString() });
      if (rec.coverLetter) {
        const cover = path.replace(/\.pdf$/, '_Cover.pdf');
        files.push(cover);
        m.push({ company: j.company, role, kind: 'cover', path: cover, mtime: new Date().toISOString() });
      }
      set(MADE_KEY, JSON.stringify(m));
      step('done', files);
    }, rec.mode === 'cloud' ? 9000 : 6000);
    return { ok: true, job: rec };
  }

  function applyPack(body) {
    const j = pageJobs().find(x => x.url === body.url) || {};
    const r = allTailored().filter(x => x.kind === 'resume' && sameCo(x.company, j.company))[0];
    const variant = (boot.matchScores[body.url] || {}).variant || 'startup';
    const slug = String(j.company || 'role').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return { ok: true, dir: 'packs/' + ymd(new Date()) + '-' + slug, resume: r ? 'tailored/' + r.path : 'profile/resume_' + variant + '.pdf',
      resume_kind: r ? 'tailored' : variant, jd_chars: 3200 + (slug.length * 97) % 2400, warnings: [] };
  }

  function ats(u) {
    const h = (() => { try { return new URL(u).hostname; } catch (e) { return ''; } })();
    return /ashbyhq/.test(h) ? 'ashby' : /lever\.co/.test(h) ? 'lever' : /greenhouse/.test(h) ? 'greenhouse' : /myworkdayjobs/.test(h) ? 'workday' : 'other';
  }

  // ── /api/ routes ──
  const json = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  async function route(path, qs, method, body) {
    switch (path) {
      case '/api/queue': {
        const items = queue(parseInt(qs.get('limit') || '10', 10) || 0, parseInt(qs.get('minutes') || '0', 10) || 0);
        return json({ ok: true, count: items.length, minutes: parseInt(qs.get('minutes') || '0', 10) || null, items });
      }
      case '/api/tailor-jobs': {
        const list = runs();
        const cloud = list.filter(r => r.mode === 'cloud');
        const todayCloud = cloud.filter(r => daysAgo(r.startedAt) === 0).length;
        return json({ ok: true, jobs: list, tailored: allTailored(),
          spend: { cloudToday: todayCloud, dailyCap: 6, estSpent: 14 + cloud.reduce((s, r) => s + (r.estCost || 0), 0), budget: 70 } });
      }
      case '/api/tailor': return json(method === 'POST' ? startTailor(body) : { ok: false, error: 'POST only' });
      case '/api/apply-pack': await wait(500); return json(applyPack(body));
      case '/api/check-live': {
        await wait(900);
        const urls = (body && body.urls) || [];
        return json({ ok: true, results: urls.map(u => ({ url: u, verdict: 'active', ats: ats(u), method: 'demo', code: 200, note: 'demo: every made-up posting counts as live' })) });
      }
      case '/api/check-active-log': return json({ ok: true, count: 0, entries: [] });
      case '/api/not-a-fit': {
        const urls = method === 'POST' ? ((body && body.add) || []) : [];
        return json({ ok: true, count: urls.length, urls });
      }
      case '/api/referral-ask': return json({ ok: true });
      case '/api/job-actions': return json({ ok: true, actions: [] });
      case '/api/open':
        setTimeout(() => note('In the demo there is no real PDF behind this. The real one opens on my PC.'), 1200);
        return json({ ok: true, opened: true });
      case '/api/state': return json({ version: 1, updatedAt: null, keys: {} });
      case '/healthz': return json({ ok: true, jobs: true, state: true, syncReady: false, warnings: [] });
      default: return json({ ok: false, error: 'not in the demo' }, 404);
    }
  }

  const realFetch = window.fetch ? window.fetch.bind(window) : null;
  let warned = false;
  window.fetch = async function (input, init) {
    const raw = typeof input === 'string' ? input : (input && input.url) || '';
    let u;
    try { u = new URL(raw, location.href); } catch (e) { u = null; }
    if (u && u.origin === location.origin && (u.pathname.startsWith('/api/') || u.pathname === '/healthz')) {
      const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      let body = null;
      try { body = init && typeof init.body === 'string' ? JSON.parse(init.body) : null; } catch (e) { body = null; }
      return route(u.pathname, u.searchParams, method, body);
    }
    if (u && u.origin === location.origin && realFetch) return realFetch(input, init);
    // Job boards, the status sheet and connectors: none of these are reached from the demo.
    if (!warned) { warned = true; setTimeout(() => note('The demo does not reach job boards. The real scan runs every morning.'), 300); }
    throw new TypeError('demo: no network requests outside this site');
  };

  // Made-up postings and the server's file links have no page to open.
  const NO_PAGE = 'This is a made-up posting, so there is no page to open.';
  const realOpen = window.open ? window.open.bind(window) : null;
  window.open = function (url) {
    if (JOB_URLS.has(String(url))) { note(NO_PAGE); return null; }
    return realOpen ? realOpen.apply(window, arguments) : null;
  };
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (JOB_URLS.has(href)) { e.preventDefault(); note(NO_PAGE); }
    else if (href.startsWith('/api/')) { e.preventDefault(); note('In the demo there is no real PDF to download.'); }
  }, true);

  // Before the page's own start-up runs (this listener is added first): move the
  // made-up dates to today, and put the banner on top.
  document.addEventListener('DOMContentLoaded', () => {
    try {
      for (const j of SEED_JOBS) { // eslint-disable-line no-undef
        j.postedDate = shiftDate(j.postedDate);
        if (j.statusAt) j.statusAt = shiftIso(j.statusAt);
        if (j.addedAt) j.addedAt = shiftIso(j.addedAt);
      }
    } catch (e) { console.warn('[demo] could not move the dates', e); }
    const bar = document.createElement('div');
    bar.className = 'demo-banner';
    bar.setAttribute('role', 'note');
    const tag = document.createElement('strong'); tag.textContent = 'Demo';
    const text = document.createElement('span');
    text.textContent = 'Made-up companies, roles and statuses. The real dashboard runs on my PC, fed by a daily scan of 200+ job boards that drops roles needing citizenship or a clearance, with resumes tailored by Claude Code. Your clicks here stay in this browser.';
    const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = 'Reset demo';
    btn.addEventListener('click', () => { resetStore(); try { localStorage.removeItem(META); } catch (e) { /* blocked */ } location.reload(); });
    bar.append(tag, text, btn);
    document.body.insertBefore(bar, document.body.firstChild);
  });
})();
