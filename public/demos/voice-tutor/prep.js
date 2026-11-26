(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);

  // ---------- tiny DOM helper: h("div", {class: "x", onclick}, child, "text", ...) ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
    return el;
  }
  const safeUrl = (u) => (typeof u === "string" && /^https?:\/\//i.test(u) ? u : null);
  const link = (u, text) => (safeUrl(u) ? h("a", { href: u, target: "_blank", rel: "noopener noreferrer" }, text) : null);

  async function api(method, path, body) {
    const r = await fetch(path, {
      method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await r.json(); } catch { /* empty body */ }
    if (!r.ok) throw new Error((data && data.detail) || `Request failed (${r.status})`);
    return data;
  }

  // ---------- exported copy ----------
  // An exported plan is this same script with the company embedded. There is no server, so ticks and
  // inputs save to the viewer's browser and anything that needs the server (jobs, live practice) is hidden.
  const EXPORT = window.__PREP_EXPORT__ || null;
  const exportKey = () => "prep-export:" + co.id;
  function saveExportProgress() {
    try { localStorage.setItem(exportKey(), JSON.stringify(prog())); } catch { /* private window: in-memory only */ }
  }
  function loadExportProgress(doc) {
    try {
      const saved = JSON.parse(localStorage.getItem("prep-export:" + doc.id) || "null");
      if (saved && typeof saved === "object") doc.progress = { done: {}, inputs: {}, results: {}, ...doc.progress, ...saved };
    } catch { /* keep exported progress */ }
  }

  // ---------- state ----------
  let status = { research: true, brain: "claude" };
  let companies = [];
  let co = null;                 // full company document
  const jobs = {};               // kind -> job view, for the current company
  const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const prog = () => (co && co.progress) || { done: {}, inputs: {}, results: {} };
  const isDone = (key) => !!prog().done[key];

  // ---------- task bookkeeping ----------
  function allTasks() {
    const p = co && co.plan;
    if (!p) return [];
    return [
      ...p.days.flatMap((d) => d.blocks.map((b) => b.key)),
      ...p.problems.map((x) => "p:" + x.id),
      ...p.designs.map((x) => "d:" + x.id),
      ...p.behavioral.map((x) => "q:" + x.id),
    ];
  }
  const refKey = (id) => {
    const p = co.plan;
    if (p.problems.some((x) => x.id === id)) return "p:" + id;
    if (p.designs.some((x) => x.id === id)) return "d:" + id;
    return "q:" + id;
  };
  const refItem = (id) => {
    const p = co.plan;
    return p.problems.find((x) => x.id === id) || p.designs.find((x) => x.id === id) || p.behavioral.find((x) => x.id === id);
  };
  const refAnchor = (id) => ({ p: "p-", d: "d-", q: "q-" }[refKey(id)[0]] + id);
  const refLabel = (id) => { const it = refItem(id); return it ? (it.title || it.question) : id; };

  function refreshCounts() {
    if (!co || !co.plan) return;
    const all = allTasks();
    const n = all.filter(isDone).length;
    const pct = all.length ? Math.round((n / all.length) * 100) : 0;
    document.querySelectorAll("[data-pbar]").forEach((el) => { el.style.width = pct + "%"; });
    document.querySelectorAll("[data-ptext]").forEach((el) => { el.textContent = `${n} of ${all.length} tasks done`; });
    for (const d of co.plan.days) {
      const k = d.blocks.filter((b) => isDone(b.key)).length;
      const el = document.querySelector(`[data-daycount="${d.date}"]`);
      if (el) { el.textContent = `${k}/${d.blocks.length}`; el.classList.toggle("all", d.blocks.length > 0 && k === d.blocks.length); }
      const nav = document.querySelector(`[data-navday="${d.date}"]`);
      if (nav) nav.classList.toggle("done", d.blocks.length > 0 && k === d.blocks.length);
    }
    document.querySelectorAll("[data-blk]").forEach((el) => el.classList.toggle("done", isDone(el.dataset.blk)));
    document.querySelectorAll("[data-ref]").forEach((el) => el.classList.toggle("done", isDone(refKey(el.dataset.ref))));
    document.querySelectorAll("input[data-task]").forEach((el) => { el.checked = isDone(el.dataset.task); });
    document.querySelectorAll("[data-grpcount]").forEach((el) => {
      const ids = el.dataset.grpcount.split(",");
      el.textContent = `${ids.filter((id) => isDone("p:" + id)).length}/${ids.length}`;
    });
  }

  async function setDone(key, value) {
    prog().done[key] = value; if (!value) delete prog().done[key];
    refreshCounts();
    if (EXPORT) { saveExportProgress(); return; }
    try { await api("POST", `/api/prep/companies/${co.id}/progress`, { kind: "done", key, value }); }
    catch (e) { flash(e.message); }
    updateSideSummary();
  }

  const checkbox = (key, label) => {
    const cb = h("input", { type: "checkbox", "data-task": key, "aria-label": label || "Done", onchange: (e) => setDone(key, e.target.checked) });
    cb.checked = isDone(key);
    return cb;
  };

  // Amber input box that saves itself after you stop typing.
  function fill(key, placeholder, rows = 2) {
    const saved = h("span", { class: "saved", "aria-live": "polite" });
    const ta = h("textarea", { class: "fill", rows, placeholder: "YOUR INPUT: " + placeholder, "aria-label": placeholder });
    ta.value = prog().inputs[key] || "";
    let t = null;
    ta.addEventListener("input", () => {
      clearTimeout(t);
      saved.textContent = "";
      t = setTimeout(async () => {
        try {
          if (!EXPORT) await api("POST", `/api/prep/companies/${co.id}/progress`, { kind: "input", key, value: ta.value });
          if (ta.value.trim()) prog().inputs[key] = ta.value; else delete prog().inputs[key];
          if (EXPORT) saveExportProgress();
          saved.textContent = "Saved";
        } catch (e) { saved.textContent = e.message; }
      }, 600);
    });
    return h("div", { class: "fillwrap" }, ta, saved);
  }

  // ---------- live practice (opens the voice interviewer on a task) ----------
  function practiceLink(task, problem, questions, label) {
    if (EXPORT) return null;
    const q = new URLSearchParams({ prep: co.id, task, problem, label: label.slice(0, 140) });
    if (questions && questions.length) q.set("questions", questions.join(","));
    return h("a", { class: "btn small primary", href: "./index.html?" + q.toString() }, "Practice live");
  }
  const READS = { on_track: "On track", stuck: "Stuck", wrong_direction: "Off course", done: "Done" };
  function resultNote(key) {
    const r = prog().results[key];
    if (!r) return null;
    const when = r.at ? new Date(r.at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
    return h("div", { class: "result" },
      h("b", {}, `Last practice ${when}: ${READS[r.read] || "finished"}`),
      h("span", { class: "why" }, ` · ${r.minutes || 0} min · ${r.mode === "coding" ? (r.hints || 0) + " hints" : r.mode || ""}`),
      r.history && !EXPORT ? h("a", { class: "why", href: "./history.html#" + encodeURIComponent(r.history.key) }, ` · Try ${r.history.n}, see all tries`) : null,
      r.debrief ? h("p", {}, r.debrief) : null,
      r.diagram ? boardFigure(r.diagram) : null,
      r.board_notes ? h("details", { class: "item" }, h("summary", {}, "Your board notes"), h("p", { style: "white-space:pre-wrap;padding:0 12px 10px" }, r.board_notes)) : null,
      r.code ? codeResult(r) : null);
  }
  // The code you wrote in a live coding round, its last test run and its review.
  const LANGS = { python: "Python", java: "Java", cpp: "C++", javascript: "JavaScript" };
  function codeResult(r) {
    const rv = r.review;
    const tests = r.run && r.run.compiled ? `${r.run.passed} of ${r.run.total} tests passed` : r.run ? "didn't run" : "not run";
    const scores = rv && rv.scores ? Object.entries(rv.scores).map(([k, v]) => `${k.replace("_", " ")} ${v}/4`).join(" · ") : "";
    return h("details", { class: "item" },
      h("summary", {}, h("span", { class: "item-title" }, "Your code"),
        h("span", { class: "tag" }, LANGS[r.language] || r.language || "Python"),
        h("span", { class: "count" }, rv ? `${rv.verdict} · ${tests}` : tests)),
      h("div", { class: "item-body" },
        rv ? h("p", {}, rv.summary) : null,
        scores ? h("p", { class: "why" }, scores) : null,
        rv ? h("p", { class: "why" }, `Time ${rv.time_complexity}. Space ${rv.space_complexity}.` + (rv.optimal ? " Optimal." : rv.better_approach ? " Better: " + rv.better_approach : "")) : null,
        rv && rv.bugs && rv.bugs.length ? h("ul", {}, rv.bugs.map((b) => h("li", {}, `Line ${b.line}: ${b.issue}`))) : null,
        rv && rv.next_steps && rv.next_steps.length ? h("p", { class: "why" }, "Practise next: " + rv.next_steps.join("; ")) : null,
        h("pre", { class: "code" }, r.code)));
  }
  // The diagram you drew in a live design round, drawn when its toggle is opened.
  function boardFigure(src) {
    const fig = h("div", { class: "diagram", role: "img", "aria-label": "Your design board diagram" });
    return h("details", { class: "item", ontoggle: (e) => { if (e.target.open && !fig.firstChild && window.Diagram) Diagram.render(fig, src); } },
      h("summary", {}, "Your board diagram"), fig);
  }
  function blockPractice(d, b) {
    const p = co.plan;
    if (b.kind === "mock") {
      const pid = b.refs.find((id) => p.problems.some((x) => x.id === id));
      if (pid) return practiceLink(b.key, `prep:${co.id}:${pid}`, null, `${d.dow}: mock on ${refLabel(pid)}`);
    }
    if (b.kind === "design") {
      const did = b.refs.find((id) => p.designs.some((x) => x.id === id));
      if (did) return practiceLink(b.key, `design:${co.id}:${did}`, null, `${d.dow}: design ${refLabel(did)}`);
    }
    if (b.kind === "behavioral" || b.kind === "story") {
      const qs = b.refs.filter((id) => p.behavioral.some((x) => x.id === id));
      if (qs.length) return practiceLink(b.key, `behavioral:${co.id}`, qs, `${d.dow}: ${qs.length} behavioral question${qs.length > 1 ? "s" : ""}`);
    }
    return null;
  }

  // ---------- jobs (research, plan, walkthroughs) ----------
  // A job remembers how it was started, so a failed one can be retried from its card.
  async function startJob(kind, path, body, pick = (r) => r) {
    try {
      const job = pick(await api("POST", path, body));
      jobs[kind] = { ...job, retry: { path, body, pick } };
      renderJobs();
      poll(kind, job.id, job.next);
      return true;
    } catch (e) { flash(e.message); return false; }
  }

  async function poll(kind, jid, since) {
    const cid = co.id;
    while (co && co.id === cid) {
      await new Promise((r) => setTimeout(r, 1500));
      let v;
      try { v = await api("GET", `/api/prep/jobs/${jid}?since=${since}`); }
      catch (e) { jobs[kind] = { ...jobs[kind], status: "error", error: e.message }; renderJobs(); return; }
      const prev = jobs[kind] || { log: [] };
      if (prev.id && prev.id !== jid) return; // replaced by a newer run
      jobs[kind] = { ...v, retry: prev.retry, log: [...(since ? prev.log : []), ...v.log] };
      since = v.next;
      renderJobs();
      if (v.status !== "running") {
        if (v.status === "done") {
          await reloadCompany();
          delete jobs[kind];
          render();
        }
        return;
      }
    }
  }

  async function resumeJobs() {
    try {
      const running = await api("GET", `/api/prep/companies/${co.id}/jobs`);
      for (const j of running) { jobs[j.kind] = j; poll(j.kind, j.id, j.next); }
      if (running.length) renderJobs();
    } catch { /* nothing running */ }
  }

  const JOB_TITLES = {
    build: "Building your prep", research: "Researching the company", plan: "Writing your plan",
    analyze: "Reading your sources", source: "Adding the source", ask: "Searching your sources",
  };
  const FAILED_TITLES = {
    build: "Building your prep stopped", research: "Research failed", plan: "The plan wasn't written",
    analyze: "Reading your sources failed", source: "The source wasn't added", ask: "No answer",
  };
  // Model or tool output can end up in an error: keep it short and drop markup.
  const cleanError = (s) => String(s || "Unknown error").replace(/<\/?[a-z_]+(\s+name="[^"]*")?\s*>/gi, " ").replace(/\s+/g, " ").trim().slice(0, 400);
  const fmtSecs = (s) => (s >= 90 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s` : `${s || 0}s`);
  // Jobs that can't run while another one is writing the same data.
  const BLOCKS = { build: ["build", "plan", "research", "analyze"], plan: ["build", "plan"], research: ["build", "research"], analyze: ["build", "analyze"] };

  function jobPanel(kind) {
    const j = jobs[kind];
    if (!j) return null;
    const err = j.status === "error";
    const steps = j.steps || [];
    const log = j.log || [];
    const recent = log.slice(-4);
    return h("div", { class: "job" + (err ? " err" : ""), role: err ? "alert" : "status" },
      h("div", { class: "job-h" }, err ? null : h("span", { class: "spin", "aria-hidden": "true" }),
        err ? (FAILED_TITLES[kind] || "Failed") : (JOB_TITLES[kind] || "Writing the walkthrough") + "…",
        h("span", { class: "secs" }, fmtSecs(j.seconds))),
      steps.length ? h("ol", { class: "steps" }, steps.map((s) => h("li", { class: s.status },
        s.name, s.note ? h("small", {}, " · " + s.note) : null))) : null,
      err ? h("p", { class: "job-msg" }, cleanError(j.error)) : null,
      !err && recent.length ? h("ol", { start: log.length - recent.length + 1 }, recent.map((l) => h("li", {}, l))) : null,
      log.length > recent.length || (err && log.length) ? h("details", {}, h("summary", {}, `All ${log.length} progress lines`),
        h("ol", {}, log.map((l) => h("li", {}, l)))) : null,
      err ? h("div", { class: "job-acts" },
        j.retry ? h("button", { class: "btn small primary", type: "button", onclick: () => startJob(kind, j.retry.path, j.retry.body, j.retry.pick) }, "Try again") : null,
        h("button", { class: "btn small ghost", type: "button", onclick: () => { delete jobs[kind]; renderJobs(); } }, "Dismiss")) : null);
  }
  function renderJobs() {
    document.querySelectorAll("[data-job]").forEach((slot) => slot.replaceChildren(jobPanel(slot.dataset.job) || ""));
    document.querySelectorAll("[data-jobbtn]").forEach((b) => {
      const k = b.dataset.jobbtn;
      const busy = (BLOCKS[k] || [k]).some((x) => jobs[x] && jobs[x].status === "running");
      b.disabled = busy || ((k === "research" || k === "analyze") && !status.research);
      if (b.dataset.idle == null) b.dataset.idle = b.textContent;
      b.textContent = jobs[k] && jobs[k].status === "running" ? "Working…" : b.dataset.idle;
    });
  }

  // ---------- sidebar ----------
  function updateSideSummary() {
    const s = companies.find((c) => co && c.id === co.id);
    if (s && co.plan) { s.tasks_done = allTasks().filter(isDone).length; s.tasks_total = allTasks().length; }
  }

  function renderCompanies() {
    const list = $("companies");
    if (!companies.length) { list.replaceChildren(h("p", { class: "side-empty" }, "No companies yet.")); return; }
    list.replaceChildren(...companies.map((c) => h("button", {
      class: "co", type: "button", "aria-current": co && co.id === c.id ? "true" : "false",
      onclick: () => { closeNav(); if (!EXPORT) selectCompany(c.id); },
    }, h("b", {}, c.name), h("small", {}, [c.role, c.interview_date && fmtDate(c.interview_date)].filter(Boolean).join(" · ") || "No details yet"))));
  }

  function renderSideNav() {
    const nav = $("side-nav");
    if (!co) { nav.replaceChildren(); return; }
    const p = co.plan;
    const groups = [h("div", { class: "navgrp" },
      h("div", { class: "bar" }, h("i", { "data-pbar": "" })),
      h("div", { class: "crumb", "data-ptext": "" }, p ? "" : "No plan yet"),
      h("h4", {}, "Start"),
      h("a", { href: "#overview" }, "Overview and countdown"),
      h("a", { href: "#details" }, "Confirmed details"),
      EXPORT ? null : h("a", { href: "#sources" }, "Your sources ", h("small", {}, `(${(co.sources || []).length})`)),
      !EXPORT && co.source_analysis ? h("a", { href: "#coverage" }, "What your sources cover") : null,
      co.research ? h("a", { href: "#rounds" }, "How each round runs") : null)];
    if (p) {
      const today = todayIso();
      groups.push(h("div", { class: "navgrp" }, h("h4", {}, "Day by day"),
        p.days.map((d) => h("a", { href: "#day-" + d.date, "data-navday": d.date, class: d.date === today ? "today" : null },
          d.dow, " ", h("small", {}, d.tag || d.title)))));
      groups.push(h("div", { class: "navgrp" }, h("h4", {}, "Practice"),
        h("a", { href: "#coding" }, "Coding ", h("small", {}, `(${p.problems.length})`)),
        p.designs.length ? h("a", { href: "#design" }, "Design ", h("small", {}, `(${p.designs.length})`)) : null,
        h("a", { href: "#behavioral" }, "Behavioral ", h("small", {}, `(${p.behavioral.length})`))));
    }
    if (co.research) groups.push(h("div", { class: "navgrp" }, h("h4", {}, "Reference"), h("a", { href: "#reference" }, "Research and sources")));
    nav.replaceChildren(...groups);
  }

  // ---------- main view ----------
  const fmtDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const daysUntil = (iso) => Math.round((new Date(iso + "T00:00:00") - new Date(todayIso() + "T00:00:00")) / 86400000);

  function render() {
    renderCompanies();
    renderSideNav();
    const view = $("view");
    const open = new Set([...document.querySelectorAll("details[open]")].map((d) => d.id).filter(Boolean));
    if (!co) { view.replaceChildren(welcome()); return; }
    view.replaceChildren(...[overview(), details(), EXPORT ? null : sourcesSection(),
      !EXPORT && co.source_analysis ? coverage() : null, co.research ? rounds() : null,
      ...(co.plan ? planSections() : []), co.research ? reference() : null].filter(Boolean));
    for (const id of open) { const d = document.getElementById(id); if (d) d.open = true; }
    renderJobs();
    refreshCounts();
  }

  function welcome() {
    return h("section", { class: "welcome", id: "overview" },
      h("h1", { class: "title" }, "Interview prep"),
      h("p", { class: "lead" }, "Add a company you're interviewing with. The app researches its interview process on the web, writes a day-by-day plan around your schedule, and lets you practice each task here, including live voice mocks."),
      h("button", { class: "btn primary", type: "button", onclick: () => openDialog(null) }, "+ Add a company"),
      status.research ? null : h("p", { class: "note warn" }, "Running with Ollama: web research is off. Plans use the offline model's own knowledge."));
  }

  function overview() {
    const p = co.plan;
    const today = todayIso();
    const tDay = p && (p.days.find((d) => d.date === today) || p.days.find((d) => d.date > today));
    const until = co.interview_date ? daysUntil(co.interview_date) : null;
    const nSrc = (co.sources || []).length;
    return h("section", { id: "overview" },
      h("p", { class: "crumb" }, [co.role, co.interview_date && "Interview " + fmtDate(co.interview_date),
        co.research && co.research.process && co.research.process.rounds.length + " rounds reported"].filter(Boolean).join(" · ")),
      h("h1", { class: "title" }, p ? p.title : co.name + " prep"),
      p ? h("p", { class: "lead" }, p.lead || p.subtitle) : h("p", { class: "lead" },
        "Add what you already have under Your sources, then Make the plan: it reads your sources, researches the company, and writes a day-by-day plan."),
      EXPORT ? null : pipeStrip(),
      h("div", { class: "stats" },
        h("div", { class: "stat" }, h("b", {}, until == null ? "–" : until < 0 ? "Done" : until === 0 ? "Today" : String(until)),
          h("span", {}, until == null ? "No interview date set" : until > 0 ? `days until the interview (${fmtDate(co.interview_date)})` : "interview day")),
        h("div", { class: "stat" }, h("b", {}, tDay ? tDay.title : "–"), h("span", {}, "today's focus")),
        h("div", { class: "stat" }, h("b", {}, p ? `${p.problems.length} + ${p.designs.length}` : "–"), h("span", {}, "coding and design problems")),
        h("div", { class: "stat" }, h("b", { "data-ptext": "" }, "–"), h("div", { class: "bar" }, h("i", { "data-pbar": "" })))),
      p && p.note ? h("p", { class: "note warn" }, p.note) : null,
      p && p.followed_sources ? h("p", { class: "hint-text" }, "This plan follows your sources. Blocks taken from one say which.") : null,
      EXPORT ? h("div", { class: "actions" },
        p && tDay ? h("a", { class: "btn", href: "#day-" + tDay.date, onclick: () => openDay(tDay.date) }, "Jump to today's card") : null,
        h("span", { class: "hint-text" }, "Demo plan for a made-up company. Ticks and notes save in this browser.")) :
      [h("div", { class: "actions" },
        h("button", { class: "btn primary", type: "button", "data-jobbtn": "build", onclick: () => planJob("build") },
          p ? "Update the plan" : "Make the plan"),
        nSrc ? h("label", { class: "chk", title: "Keep your sources' days, problems and prompts, mapped onto your dates" },
          h("input", { type: "checkbox", id: "follow-src", checked: p ? p.followed_sources !== false : true }), "Follow my sources") : null,
        h("button", { class: "btn", type: "button", onclick: () => openDialog(co) }, "Edit details"),
        p ? h("a", { class: "btn", href: `/api/prep/companies/${encodeURIComponent(co.id)}/export`, download: "" }, "Export as HTML") : null,
        p && tDay ? h("a", { class: "btn ghost", href: "#day-" + tDay.date, onclick: () => openDay(tDay.date) }, "Jump to today's card") : null),
      h("p", { class: "hint-text" }, buildHint()),
      h("div", { class: "redo" }, "Redo one step:",
        nSrc && status.research ? h("button", { class: "btn small ghost", type: "button", "data-jobbtn": "analyze",
          onclick: () => startJob("analyze", `/api/prep/companies/${co.id}/analyze`) }, "Read sources again") : null,
        status.research ? h("button", { class: "btn small ghost", type: "button", "data-jobbtn": "research",
          onclick: () => startJob("research", `/api/prep/companies/${co.id}/research`) }, co.research ? "Research again" : "Research only") : null,
        h("button", { class: "btn small ghost", type: "button", "data-jobbtn": "plan", onclick: () => planJob("plan") },
          "Plan only, with what's there")),
      h("div", { "data-job": "build" }), h("div", { "data-job": "analyze" }), h("div", { "data-job": "research" }), h("div", { "data-job": "plan" })]);
  }

  function planJob(kind) {
    const p = co.plan;
    if (p && allTasks().some(isDone) && !confirm("Make a new plan? Ticked tasks keep their keys only where days and problems match.")) return;
    const follow = !!(co.sources || []).length && !!document.getElementById("follow-src")?.checked;
    startJob(kind, `/api/prep/companies/${co.id}/${kind}`, { follow_sources: follow });
  }

  const shortDate = (iso) => (iso ? new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");

  // What each part of the pipeline has, and whether it's current.
  function pipeStrip() {
    const pl = co.pipeline || {};
    const item = (cls, text, small) => h("li", { class: cls || null }, text, small ? h("small", {}, " " + small) : null);
    const items = [];
    items.push(pl.sources ? item("ok", `${pl.sources} source${pl.sources > 1 ? "s" : ""}`) : item("", "No sources"));
    if (pl.sources && status.research) {
      const a = pl.analysis;
      items.push(!a ? item("", "Sources not read yet") : a.fresh ? item("ok", "Sources read", shortDate(a.at)) : item("stale", "Sources changed since read"));
    }
    if (status.research) {
      const r = pl.research;
      items.push(!r ? item("", "No research yet") : r.fresh ? item("ok", "Researched", shortDate(r.at)) : item("stale", "Research out of date", shortDate(r.at)));
    }
    const pp = pl.plan;
    items.push(!pp ? item("", "No plan yet") : !pp.with_research && status.research ? item("stale", "Plan made without research", shortDate(pp.at)) : item("ok", "Plan", shortDate(pp.at)));
    return h("ul", { class: "pipe", "aria-label": "Prep status" }, items);
  }

  function buildHint() {
    const pl = co.pipeline || {};
    const run = [];
    if (pl.sources && status.research && !(pl.analysis && pl.analysis.fresh)) run.push("read your sources end to end");
    if (status.research && !(pl.research && pl.research.fresh)) run.push("research the company on the web");
    run.push("write the plan");
    const model = status.prep_model ? ` with Claude ${status.prep_model}` : "";
    const slow = run.length > 1 ? " Takes about 10 to 20 minutes; you can leave this page." : "";
    return `${co.plan ? "Update the plan" : "Make the plan"} will ${run.join(", then ")}${model}. Steps already up to date are skipped.${slow}`;
  }

  function details() {
    const r = co.research;
    return h("section", { id: "details" },
      h("h2", {}, "Confirmed details"),
      h("p", { class: "lead" }, "What you've been told by the recruiter beats anything from the web. Keep it here: dates, times, interviewers, tools. Research and plans read it."),
      EXPORT ? (co.notes ? h("div", { class: "note", style: "white-space:pre-wrap" }, co.notes) : null) : notesBox(),
      r && r.logistics && r.logistics.length ? h("div", { class: "note" }, h("b", {}, "Logistics from research"),
        h("ul", {}, r.logistics.map((x) => h("li", {}, x)))) : null);
  }

  function notesBox() {
    const saved = h("span", { class: "saved", "aria-live": "polite" });
    const ta = h("textarea", { class: "fill", rows: 5, placeholder: "YOUR INPUT: schedule, round format, tools, people, anything from recruiter emails", "aria-label": "Confirmed details" });
    ta.value = co.notes || "";
    let t = null;
    ta.addEventListener("input", () => {
      clearTimeout(t); saved.textContent = "";
      t = setTimeout(async () => {
        try { await api("PATCH", `/api/prep/companies/${co.id}`, { notes: ta.value }); co.notes = ta.value; saved.textContent = "Saved"; }
        catch (e) { saved.textContent = e.message; }
      }, 600);
    });
    return h("div", {}, ta, saved);
  }

  // ---------- your sources: artifacts, links, files, pasted notes ----------
  const KIND_LABEL = { link: "Link", file: "File", text: "Notes" };
  let srcTab = "link";

  function sourcesSection() {
    const items = co.sources || [];
    return h("section", { id: "sources" },
      h("h2", {}, "Your sources"),
      h("p", { class: "lead" }, "Add material you already trust: a claude.ai artifact, a prep page, a PDF, notes. Research and the planner search these files and can build the plan around them."),
      items.length ? h("div", { class: "grp-body", style: "padding:0" }, items.map(sourceItem)) : h("p", { class: "hint-text" }, "No sources yet."),
      sourceForm(),
      h("div", { "data-job": "source" }),
      items.length ? askBox() : null);
  }

  function askBox() {
    const qa = co.source_qa || [];
    const q = h("input", { placeholder: "e.g. What does my playbook say to do the night before?", "aria-label": "Question for your sources", maxlength: 500, required: true });
    const err = h("p", { class: "form-err", role: "alert" });
    return h("div", { class: "note src-add", id: "ask" },
      h("b", {}, "Ask your sources"),
      h("p", { class: "hint-text", style: "margin:0" }, "Answers come only from the files above, with quotes."),
      h("form", { class: "src-form ask-form", onsubmit: async (e) => {
        e.preventDefault(); err.textContent = "";
        try {
          const job = await api("POST", `/api/prep/companies/${co.id}/ask`, { question: q.value });
          jobs.ask = job; renderJobs(); poll("ask", job.id, job.next);
        } catch (x) { err.textContent = x.message; }
      } }, q, h("button", { class: "btn primary", type: "submit", "data-jobbtn": "ask" }, "Ask")),
      err,
      h("div", { "data-job": "ask" }),
      qa.map((a) => h("div", { class: "qa" + (a.found ? "" : " nf") },
        h("p", { class: "qa-q" }, a.question),
        h("p", {}, a.answer),
        a.quotes.length ? h("ul", { class: "qa-quotes" }, a.quotes.map((x) => h("li", {}, h("q", {}, x.quote), sourceTag(x.source)))) : null)),
      qa.length ? h("button", { class: "btn small ghost", type: "button", style: "align-self:flex-start", onclick: async () => {
        try { await api("DELETE", `/api/prep/companies/${co.id}/ask`); co.source_qa = []; render(); } catch (x) { flash(x.message); }
      } }, "Clear answers") : null);
  }

  function sourceItem(s) {
    const body = h("pre", { class: "src-text" }, "Loading…");
    const files = h("div", { class: "mats" });
    const base = `/api/prep/companies/${co.id}/sources/${s.id}`;
    const tab = (href, text, extra = {}) => h("a", { href, target: "_blank", rel: "noopener noreferrer", ...extra }, text);
    const item = h("details", { class: "item", id: "src-" + s.id, ontoggle: async (e) => {
      if (!e.target.open || body.dataset.loaded) return;
      try {
        const full = await api("GET", base);
        body.textContent = full.preview + (full.truncated ? "\n\n[Preview cut at 20,000 characters. Open Full text for all of it. Claude searches the whole file.]" : "");
        body.dataset.loaded = "1";
        files.replaceChildren(...[
          full.original ? tab(`${base}/original`, `Saved copy (${full.original.toUpperCase()})`) : null,
          full.original ? tab(`${base}/original?download=1`, "Download", { download: "" }) : null,
          tab(`${base}/text`, `Full text (${full.chars.toLocaleString()} chars)`),
          !full.original && s.kind === "link" ? h("span", { class: "why" }, "No saved copy yet: use Fetch again to save the page itself.") : null,
        ].filter(Boolean));
      } catch (err) { body.textContent = err.message; }
    } },
      h("summary", {}, h("span", { class: "item-title" }, s.title), h("span", { class: "tag" }, KIND_LABEL[s.kind] || s.kind),
        h("span", { class: "count" }, s.chars < 1000 ? `${s.chars} chars` : `${Math.round(s.chars / 1000)}k chars`)),
      h("div", { class: "item-body" },
        h("div", { class: "mats" },
          safeUrl(s.origin) ? link(s.origin, "Open link") : h("span", { class: "why" }, s.origin),
          h("span", { class: "why" }, "Added " + new Date(s.refreshed || s.added).toLocaleDateString(undefined, { month: "short", day: "numeric" })),
          s.kind === "link" ? h("button", { class: "btn small", type: "button", "data-jobbtn": "source",
            onclick: () => startJob("source", `/api/prep/companies/${co.id}/sources/${s.id}/refresh`) }, "Fetch again") : null,
          h("button", { class: "btn small", type: "button", onclick: async () => {
            if (!confirm(`Remove “${s.title}” from ${co.name}'s sources?`)) return;
            try { await api("DELETE", `/api/prep/companies/${co.id}/sources/${s.id}`); await reloadCompany(); render(); }
            catch (err) { flash(err.message); }
          } }, "Remove")),
        files,
        body));
    return item;
  }

  function sourceForm() {
    const err = h("p", { class: "form-err", role: "alert" });
    const panes = {
      link: () => {
        const url = h("input", { type: "url", placeholder: "https://claude.ai/artifact/…  or any public page", "aria-label": "Link", required: true });
        const title = h("input", { placeholder: "Title (optional)", "aria-label": "Title" });
        const go = h("button", { class: "btn primary", type: "submit", "data-jobbtn": "source" }, "Add link");
        return h("form", { class: "src-form", onsubmit: async (e) => {
          e.preventDefault(); err.textContent = "";
          if (await startJob("source", `/api/prep/companies/${co.id}/sources`, { kind: "link", url: url.value, title: title.value }, (r) => r.job)) {
            url.value = ""; title.value = "";
          }
        } }, url, title, go,
          h("p", { class: "hint-text" }, "claude.ai artifacts open with your Claude login: the full page for ones you own or can edit, a summary for ones shared with you. If a link won't load, save the page from claude.ai (Ctrl+S) and use ",
            h("a", { href: "#", onclick: (e) => { e.preventDefault(); show("file"); } }, "Upload a file"), "."));
      },
      file: () => {
        const file = h("input", { type: "file", accept: ".html,.htm,.md,.markdown,.txt,.pdf,.csv,.json", "aria-label": "File", required: true });
        const go = h("button", { class: "btn primary", type: "submit" }, "Upload");
        return h("form", { class: "src-form", onsubmit: async (e) => {
          e.preventDefault(); err.textContent = "";
          const f = file.files[0];
          if (!f) return;
          if (f.size > 15 * 1024 * 1024) { err.textContent = "That file is over 15 MB."; return; }
          go.disabled = true; go.textContent = "Uploading…";
          try {
            const data = await new Promise((res, rej) => {
              const rd = new FileReader();
              rd.onload = () => res(String(rd.result).split(",", 2)[1] || "");
              rd.onerror = () => rej(new Error("Couldn't read that file."));
              rd.readAsDataURL(f);
            });
            await api("POST", `/api/prep/companies/${co.id}/sources`, { kind: "file", name: f.name, data });
            await reloadCompany(); render();
          } catch (x) { err.textContent = x.message; go.disabled = false; go.textContent = "Upload"; }
        } }, file, go,
          h("p", { class: "hint-text" }, "HTML (an artifact saved from claude.ai with Ctrl+S works best: the page itself is kept and opens as Saved copy), Markdown, text or PDF, up to 15 MB."));
      },
      text: () => {
        const title = h("input", { placeholder: "Title, e.g. Recruiter email Nov 12", "aria-label": "Title" });
        const text = h("textarea", { rows: 6, placeholder: "Paste text", "aria-label": "Text", required: true });
        const go = h("button", { class: "btn primary", type: "submit" }, "Save notes");
        return h("form", { class: "src-form", onsubmit: async (e) => {
          e.preventDefault(); err.textContent = "";
          try {
            await api("POST", `/api/prep/companies/${co.id}/sources`, { kind: "text", title: title.value, text: text.value });
            await reloadCompany(); render();
          } catch (x) { err.textContent = x.message; }
        } }, title, text, go);
      },
    };
    const slot = h("div", {});
    const tabs = h("div", { class: "src-tabs", role: "tablist", "aria-label": "Add a source" });
    const show = (k) => {
      srcTab = k;
      tabs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.k === k)));
      slot.replaceChildren(panes[k]());
    };
    for (const [k, label] of [["link", "Link or artifact"], ["file", "Upload a file"], ["text", "Paste text"]]) {
      tabs.append(h("button", { type: "button", role: "tab", "data-k": k, onclick: () => show(k) }, label));
    }
    const wrap = h("div", { class: "note src-add" }, h("b", {}, "Add a source"), tabs, slot, err);
    show(srcTab);
    return wrap;
  }

  function rounds() {
    const r = co.research;
    const pr = r.process || { rounds: [] };
    return h("section", { id: "rounds" },
      h("h2", {}, "How each round runs"),
      r.role_notes ? h("p", { class: "lead" }, r.role_notes) : null,
      pr.overview ? h("div", { class: "note" }, pr.overview) : null,
      pr.rounds.length ? h("div", { class: "tw note" }, h("table", {},
        h("tr", {}, h("th", {}, "Round"), h("th", {}, "Length"), h("th", {}, "Format"), h("th", {}, "Focus")),
        pr.rounds.map((x) => h("tr", {}, h("td", {}, h("b", {}, x.name)), h("td", {}, x.duration), h("td", {}, x.format), h("td", {}, x.focus))))) : null,
      r.round_structure && r.round_structure.length ? h("div", { class: "note" }, h("b", {}, "Inside one round"),
        h("ul", {}, r.round_structure.map((x) => h("li", {}, h("b", {}, x.span), ": ", x.what)))) : null);
  }

  // ---------- plan ----------
  function planSections() {
    const p = co.plan;
    const today = todayIso();
    const out = [];
    out.push(h("section", { id: "days" }, h("h2", {}, "Day by day"),
      h("p", { class: "lead" }, "Tick blocks as you finish them. Today's card opens on its own."),
      p.days.map((d) => dayCard(d, d.date === today))));

    const byPattern = new Map();
    for (const x of p.problems) { if (!byPattern.has(x.pattern)) byPattern.set(x.pattern, []); byPattern.get(x.pattern).push(x); }
    out.push(h("section", { id: "coding" }, h("h2", {}, "Coding practice"),
      h("p", { class: "lead" }, "Grouped by pattern. Open a problem for its links and a five-stage walkthrough: Understand, Brute force, Optimize, Trace, Complexity."),
      [...byPattern].map(([pat, xs]) => h("details", { class: "grp", id: "grp-" + slug(pat) },
        h("summary", {}, h("b", {}, pat), h("span", { class: "count", "data-grpcount": xs.map((x) => x.id).join(",") }, "")),
        h("div", { class: "grp-body" }, xs.map(problemItem))))));

    if (p.designs.length) out.push(h("section", { id: "design" }, h("h2", {}, "Design practice"), p.designs.map(designItem)));

    const byValue = new Map();
    for (const x of p.behavioral) { if (!byValue.has(x.value)) byValue.set(x.value, []); byValue.get(x.value).push(x); }
    out.push(h("section", { id: "behavioral" }, h("h2", {}, "Behavioral"),
      h("p", { class: "lead" }, "Write each story in STAR form (Situation, Task, Action, Result, what you learned), then say it aloud in about two minutes."),
      [...byValue].map(([val, xs]) => h("div", { class: "note" }, h("b", {}, val), h("div", { class: "grp-body", style: "padding:8px 0 0" }, xs.map(behavioralItem))))));
    return out;
  }

  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // "from My Loop Notes": which of your sources a block or problem came from.
  function sourceTag(sid) {
    if (!sid) return null;
    const s = (co.sources || []).find((x) => x.id === sid);
    const label = "from " + (s ? s.title : sid);
    return EXPORT || !s ? h("span", { class: "src-tag" }, label)
      : h("a", { class: "src-tag", href: "#src-" + sid, onclick: () => openItem("src-" + sid) }, label);
  }

  function dayCard(d, isToday) {
    return h("details", { class: "day" + (isToday ? " is-today" : ""), id: "day-" + d.date, open: isToday },
      h("summary", {}, h("span", { class: "dh" }, d.dow), h("span", { class: "day-title" }, d.title),
        d.tag ? h("span", { class: "tag" }, d.tag) : null, isToday ? h("span", { class: "today-pill" }, "Today") : null,
        h("span", { class: "count", "data-daycount": d.date }, "")),
      h("div", { class: "day-body" },
        d.blocks.map((b) => h("div", { class: "blk", "data-blk": b.key },
          checkbox(b.key, `${d.dow}, ${b.time}`),
          h("span", { class: "time" }, b.time),
          h("div", { class: "what" },
            h("p", {}, h("span", { class: "kind " + b.kind }, b.kind), b.text, sourceTag(b.source)),
            b.refs.length || blockPractice(d, b) ? h("div", { class: "refs" }, b.refs.map((id) => h("a", {
              class: "ref", href: "#" + refAnchor(id), "data-ref": id, onclick: () => openItem(refAnchor(id)),
            }, refLabel(id))), blockPractice(d, b)) : null,
            resultNote(b.key)))),
        h("div", { class: "write" }, h("label", {}, "What to write down"), h("p", { class: "hint-text", style: "margin:0" }, d.write_down || "What went well, what to redo tomorrow."),
          fill("log:" + d.date, "today's log", 3))));
  }

  function problemItem(x) {
    const walkSlot = h("div", { class: "walk" });
    const item = h("details", { class: "item", id: "p-" + x.id, ontoggle: (e) => { if (e.target.open) renderWalk(x, walkSlot); } },
      h("summary", {}, checkbox("p:" + x.id, x.title), h("span", { class: "item-title" }, x.title),
        h("span", { class: "diff " + String(x.difficulty).toLowerCase() }, x.difficulty)),
      h("div", { class: "item-body" },
        x.why || x.source ? h("p", { class: "why" }, x.why, sourceTag(x.source)) : null,
        h("div", { class: "mats" }, link(x.leetcode_url, "LeetCode"), link(x.neetcode_url, "NeetCode"),
          practiceLink("p:" + x.id, `prep:${co.id}:${x.id}`, null, `Mock: ${x.title}`)),
        resultNote("p:" + x.id),
        walkSlot,
        fill("sim:" + x.id, "did I solve it in 30 minutes? what did I miss?", 2)));
    // A click on the checkbox shouldn't toggle the <details>.
    item.querySelector("summary input").addEventListener("click", (e) => e.stopPropagation());
    return item;
  }

  function renderWalk(x, slot) {
    const w = (co.plan.walkthroughs || {})[x.id];
    const kind = "walk:" + x.id;
    if (!w && EXPORT) { slot.replaceChildren(); return; }
    if (!w) {
      slot.replaceChildren(
        h("button", { class: "btn small", type: "button", "data-jobbtn": kind, onclick: () => startJob(kind, `/api/prep/companies/${co.id}/walkthrough/${encodeURIComponent(x.id)}`) },
          "Write the five-stage walkthrough"),
        h("div", { "data-job": kind }));
      renderJobs();
      return;
    }
    slot.replaceChildren(
      w.statement ? h("p", {}, w.statement) : null,
      h("details", { class: "item" }, h("summary", {}, "Show the walkthrough (try it blind first)"),
        h("div", { class: "item-body walk" }, w.stages.map((s) => h("div", { class: "stage" },
          h("h4", {}, s.name),
          s.lines.map((l) => h("p", { class: "line" + (l.who === "Note" ? " note-line" : "") }, l.who === "Note" ? null : h("b", {}, l.who + ": "), l.text)),
          s.code ? h("pre", { class: "code" }, s.code) : null)))));
  }

  function renderDesignWalk(x, slot) {
    const w = (co.plan.design_walkthroughs || {})[x.id];
    const kind = "dwalk:" + x.id;
    if (!w && EXPORT) { slot.replaceChildren(); return; }
    if (!w) {
      slot.replaceChildren(
        h("button", { class: "btn small", type: "button", "data-jobbtn": kind, onclick: () => startJob(kind, `/api/prep/companies/${co.id}/design-walkthrough/${encodeURIComponent(x.id)}`) },
          "Write the five-stage walkthrough and diagram"),
        h("div", { "data-job": kind }));
      renderJobs();
      return;
    }
    const fig = h("div", { class: "diagram", role: "img", "aria-label": `${x.title} diagram` });
    const body = h("div", { class: "item-body walk" },
      w.stages.map((s) => h("div", { class: "stage" },
        h("h4", {}, s.name),
        s.lines.map((l) => h("p", { class: "line" + (l.who === "Note" ? " note-line" : "") }, l.who === "Note" ? null : h("b", {}, l.who + ": "), l.text)),
        s.code ? h("pre", { class: "code" }, s.code) : null)),
      w.diagram ? h("div", { class: "stage" }, h("h4", {}, "Diagram"), fig) : null);
    const det = h("details", { class: "item", ontoggle: (e) => { if (e.target.open && w.diagram && !fig.firstChild && window.Diagram) Diagram.render(fig, w.diagram); } },
      h("summary", {}, "Show the walkthrough (try it blind first)"), body);
    slot.replaceChildren(w.summary ? h("p", {}, w.summary) : null, det);
  }

  function designItem(x) {
    const walkSlot = h("div", { class: "walk" });
    const item = h("details", { class: "item", id: "d-" + x.id, ontoggle: (e) => { if (e.target.open) renderDesignWalk(x, walkSlot); } },
      h("summary", {}, checkbox("d:" + x.id, x.title), h("span", { class: "item-title" }, x.title), h("span", { class: "tag" }, x.kind)),
      h("div", { class: "item-body" }, h("p", {}, x.prompt),
        x.focus.length ? h("ul", {}, x.focus.map((f) => h("li", {}, f))) : null,
        h("div", { class: "mats" }, practiceLink("d:" + x.id, `design:${co.id}:${x.id}`, null, `Design: ${x.title}`)),
        resultNote("d:" + x.id),
        walkSlot,
        fill("design:" + x.id, "your classes or components, the trade-offs you chose", 3)));
    item.querySelector("summary input").addEventListener("click", (e) => e.stopPropagation());
    return item;
  }

  function behavioralItem(x) {
    const item = h("details", { class: "item", id: "q-" + x.id },
      h("summary", {}, checkbox("q:" + x.id, x.question), h("span", { class: "item-title" }, x.question)),
      h("div", { class: "item-body" }, x.tip ? h("p", { class: "why" }, x.tip) : null,
        h("div", { class: "mats" }, practiceLink("q:" + x.id, `behavioral:${co.id}`, [x.id], `Behavioral: ${x.question}`)),
        resultNote("q:" + x.id),
        fill("story:" + x.id, "Situation, Task, Action, Result, Learned", 5)));
    item.querySelector("summary input").addEventListener("click", (e) => e.stopPropagation());
    return item;
  }

  // What a full read of the sources found, and what research says is missing from them.
  function coverage() {
    const a = co.source_analysis;
    const r = co.research || {};
    const list = (title, xs, fn) => (xs && xs.length ? h("div", { class: "note" }, h("b", {}, title), h("ul", {}, xs.map(fn))) : null);
    const fold = (title, xs, fn) => (xs && xs.length ? h("details", { class: "item", id: "cov-" + title.toLowerCase().replace(/\W+/g, "-") },
      h("summary", {}, h("span", { class: "item-title" }, title), h("span", { class: "count" }, String(xs.length))),
      h("div", { class: "item-body" }, h("ul", {}, xs.map(fn)))) : null);
    const stale = co.pipeline && co.pipeline.analysis && !co.pipeline.analysis.fresh;
    return h("section", { id: "coverage" },
      h("h2", {}, "What your sources cover"),
      h("p", { class: "crumb" }, `Read end to end on ${shortDate(a.analyzed_at)}${a.model ? " by Claude " + a.model : ""}.` +
        (stale ? " Your sources changed since: Update the plan reads them again." : "")),
      a.overview ? h("p", { class: "lead" }, a.overview) : null,
      list("Covered well", a.strengths, (s) => h("li", {}, s)),
      list("Thin or missing", a.gaps, (g) => h("li", {}, h("b", {}, g.area), ": ", g.why)),
      list("Worth adding, from research", r.worth_adding, (w) => h("li", {}, h("span", { class: "tag" }, w.kind), " ", w.item, " ",
        h("span", { class: "why" }, w.why), " ", link(w.url, "source"))),
      list("Checked against current reports", r.playbook_checks, (c) => h("li", {}, h("span", { class: "verdict " + c.verdict }, c.verdict), c.claim,
        c.note ? h("span", { class: "why" }, " " + c.note) : null, " ", link(c.url, "source"))),
      !r.worth_adding && status.research ? h("p", { class: "hint-text" }, "Research hasn't checked these yet. Update the plan runs it.") : null,
      h("div", { class: "grp-body", style: "padding:0" },
        fold("Rounds", a.loop, (x) => h("li", {}, h("b", {}, x.round), x.when ? ` (${x.when})` : "", ": ", x.format, x.focus ? " · " + x.focus : "")),
        fold("Schedule", a.schedule, (x) => h("li", {}, h("b", {}, x.label), ": ", x.focus)),
        fold("Coding problems", a.problems, (x) => h("li", {}, link(x.leetcode_url, x.title) || x.title, " ", h("span", { class: "why" }, x.pattern))),
        fold("Design prompts", a.designs, (x) => h("li", {}, x.title, " ", h("span", { class: "why" }, x.kind))),
        fold("Behavioral", a.behavioral, (x) => h("li", {}, h("b", {}, x.value), ": ", x.item)),
        fold("Logistics", a.logistics, (x) => h("li", {}, x)),
        fold("Worth checking", a.verify, (x) => h("li", {}, x))));
  }

  function reference() {
    const r = co.research;
    const list = (title, xs, fn) => (xs && xs.length ? h("div", { class: "note" }, h("b", {}, title), h("ul", {}, xs.map(fn))) : null);
    return h("section", { id: "reference" }, h("h2", {}, "Research and sources"),
      h("p", { class: "crumb" }, "Researched " + (r.researched_at || "") + ". Candidate reports vary, so check anything important with your recruiter."),
      r.company_summary ? h("div", { class: "note" }, r.company_summary) : null,
      list("From your sources", r.from_your_sources, (f) => h("li", {}, f.fact, sourceTag(String(f.source || "").replace(/\.md$/, "")))),
      list("Values and what they look for", r.values, (v) => h("li", {}, h("b", {}, v.name), ": ", v.meaning)),
      list("Reported coding patterns", r.coding_topics, (t) => h("li", {}, h("b", {}, t.pattern), ` (${t.frequency})`,
        t.examples.length ? ": " : "", t.examples.map((e, i) => [i ? ", " : "", link(e.leetcode_url, e.title) || e.title]))),
      list("System design", r.system_design, (t) => h("li", {}, h("b", {}, t.topic), ": ", t.notes)),
      list("Behavioral tips", r.behavioral_tips, (t) => h("li", {}, t)),
      list("Recent news", r.recent_news, (n) => h("li", {}, link(n.url, n.headline) || n.headline, " ", h("span", { class: "why" }, n.why_it_matters))),
      list("Sources", r.sources, (s) => h("li", {}, link(s.url, s.title || s.url) || s.title)));
  }

  // ---------- navigation helpers ----------
  function openItem(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.open = true;
    const grp = el.closest("details.grp");
    if (grp) grp.open = true;
  }
  function openDay(date) { const el = document.getElementById("day-" + date); if (el) el.open = true; }
  window.addEventListener("hashchange", () => openItem(location.hash.slice(1)));

  function flash(msg) {
    const n = h("div", { class: "job err", role: "alert", style: "position:fixed;bottom:16px;right:16px;z-index:90;max-width:420px" }, msg);
    document.body.append(n);
    setTimeout(() => n.remove(), 6000);
  }

  // ---------- add / edit dialog ----------
  const dlg = $("dlg");
  let editing = null;
  function openDialog(c) {
    editing = c;
    const f = $("dlg-form");
    f.reset();
    $("dlg-err").textContent = "";
    $("dlg-title").textContent = c ? "Edit " + c.name : "Add a company";
    $("dlg-delete").hidden = !c;
    if (c) for (const k of ["name", "role", "interview_date", "hours_per_day", "weak_areas", "notes"]) f.elements[k].value = c[k] ?? "";
    dlg.showModal();
  }
  $("dlg-form").addEventListener("submit", async (e) => {
    if (e.submitter && e.submitter.value === "cancel") return;
    e.preventDefault();
    const f = e.target;
    const body = Object.fromEntries(["name", "role", "interview_date", "hours_per_day", "weak_areas", "notes"].map((k) => [k, f.elements[k].value]));
    try {
      const saved = editing ? await api("PATCH", `/api/prep/companies/${editing.id}`, body) : await api("POST", "/api/prep/companies", body);
      dlg.close();
      await loadCompanies();
      await selectCompany(saved.id);
    } catch (err) { $("dlg-err").textContent = err.message; }
  });
  $("dlg-delete").addEventListener("click", async () => {
    if (!editing || !confirm(`Delete ${editing.name} and its plan and progress? This can't be undone.`)) return;
    try {
      await api("DELETE", `/api/prep/companies/${editing.id}`);
      dlg.close();
      co = null;
      history.replaceState(null, "", location.pathname);
      await loadCompanies();
      if (companies.length) await selectCompany(companies[0].id); else render();
    } catch (err) { $("dlg-err").textContent = err.message; }
  });
  $("btn-add").addEventListener("click", () => { closeNav(); openDialog(null); });

  // ---------- mobile sections menu ----------
  function closeNav() { document.body.classList.remove("nav"); $("menubtn").setAttribute("aria-expanded", "false"); }
  $("menubtn").addEventListener("click", () => {
    const on = document.body.classList.toggle("nav");
    $("menubtn").setAttribute("aria-expanded", String(on));
  });
  $("scrim").addEventListener("click", closeNav);
  $("side").addEventListener("click", (e) => { if (e.target.closest("a")) closeNav(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNav(); });

  // ---------- loading ----------
  async function loadCompanies() { companies = await api("GET", "/api/prep/companies"); }
  async function reloadCompany() { if (co) co = await api("GET", `/api/prep/companies/${co.id}`); await loadCompanies(); }

  async function selectCompany(cid) {
    for (const k of Object.keys(jobs)) delete jobs[k];
    co = await api("GET", `/api/prep/companies/${cid}`);
    const url = new URL(location.href);
    url.searchParams.set("c", cid);
    history.replaceState(null, "", url.pathname + url.search + location.hash);
    render();
    resumeJobs();
    if (location.hash) openItem(location.hash.slice(1));
  }

  (async () => {
    if (EXPORT) {
      co = EXPORT;
      loadExportProgress(co);
      companies = [{ id: co.id, name: co.name, role: co.role, interview_date: co.interview_date }];
      $("btn-add").hidden = true;
      document.title = (co.plan && co.plan.title) || co.name + " prep";
      render();
      if (location.hash) openItem(location.hash.slice(1));
      return;
    }
    try { status = await api("GET", "/api/prep/status"); } catch { /* defaults */ }
    try { await loadCompanies(); } catch (e) { $("view").replaceChildren(h("p", { class: "note warn" }, "Couldn't reach the local server: " + e.message)); return; }
    const want = new URLSearchParams(location.search).get("c");
    const pick = companies.find((c) => c.id === want) || companies[0];
    if (pick) await selectCompany(pick.id); else render();
  })();
})();
