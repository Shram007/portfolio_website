// Practice history: every problem you've practised, its tries, and Redo.
(() => {
  const $ = (id) => document.getElementById(id);
  const READS = { on_track: "On track", stuck: "Stuck", wrong_direction: "Wrong direction", done: "Done" };
  const LANGS = { python: "Python", java: "Java", cpp: "C++", javascript: "JavaScript" };
  const KIND = { coding: "Coding", design: "Design", behavioral: "Behavioral" };
  let all = [];
  let kind = "";
  const full = {}; // key -> full doc, loaded when a problem is opened

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
    return el;
  }
  const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");
  const vClass = (v) => "verdict v-" + String(v || "").toLowerCase().replace(/\s+/g, "-");
  const tryLabel = (t) => t.verdict || (t.tests && t.tests.total ? `${t.tests.passed}/${t.tests.total} tests` : READS[t.read] || (t.finished ? "Finished" : "Started"));

  function redoHref(s, fromTry) {
    const q = new URLSearchParams({ problem: s.redo_id, redo: s.key, label: `${s.title} (try ${s.count + 1})` });
    if (fromTry) q.set("from_try", String(fromTry)); else q.set("fresh", "1");
    return "./index.html?" + q.toString();
  }

  function render() {
    const company = $("f-company").value;
    const redoOnly = $("f-redo").checked;
    const q = $("f-q").value.trim().toLowerCase();
    const shown = all.filter((s) => (!kind || s.kind === kind) && (!company || s.companies.includes(company))
      && (!redoOnly || s.needs_redo) && (!q || (s.title + " " + (s.pattern || "")).toLowerCase().includes(q)));
    const tries = shown.reduce((n, s) => n + s.count, 0);
    $("hist-count").textContent = all.length
      ? `${shown.length} problem${shown.length === 1 ? "" : "s"}, ${tries} tr${tries === 1 ? "y" : "ies"}` + (shown.length < all.length ? ` (of ${all.length})` : "")
      : "";
    if (!all.length) {
      $("hist-list").replaceChildren(h("div", { class: "panel hist-empty" },
        h("p", {}, "Nothing here yet. Practise a problem on the Interview tab: each session is saved here as a try when you Submit for review or Finish & debrief."),
        h("a", { class: "btn primary", href: "./index.html" }, "Start practising")));
      return;
    }
    $("hist-list").replaceChildren(...(shown.length ? shown.map(item) : [h("p", { class: "hint-text" }, "No problems match these filters.")]));
    const want = decodeURIComponent(location.hash.slice(1));
    if (want) { const el = document.getElementById("h-" + want); if (el && !el.open) { el.open = true; el.scrollIntoView({ block: "start" }); } }
  }

  function item(s) {
    const body = h("div", { class: "hist-body" }, h("p", { class: "hint-text" }, "Loading tries…"));
    const d = h("details", { class: "panel hist-item", id: "h-" + s.key, ontoggle: (e) => { if (e.target.open) loadTries(s, body); } },
      h("summary", {},
        h("div", { class: "hist-title" },
          h("b", {}, s.title || s.key),
          h("span", { class: "tag" }, KIND[s.kind] || s.kind),
          s.difficulty && s.kind === "coding" ? h("span", { class: "diff " + s.difficulty.toLowerCase() }, s.difficulty) : null,
          s.pattern ? h("span", { class: "hint-text" }, s.pattern) : null,
          s.companies.length ? h("span", { class: "hint-text" }, s.companies.join(", ")) : null),
        h("div", { class: "hist-meta" },
          h("span", { class: "trail", "aria-label": "Tries in order" }, s.tries.map((t) =>
            h("span", { class: "pip " + vClass(t.verdict), title: `Try ${t.n}, ${fmt(t.at)}: ${tryLabel(t)}` }, String(t.n)))),
          s.needs_redo ? h("span", { class: "chip stuck" }, "Needs a redo") : null,
          s.best_verdict ? h("span", { class: vClass(s.best_verdict) }, "Best: " + s.best_verdict) : null,
          h("span", { class: "hint-text" }, `${s.count} tr${s.count === 1 ? "y" : "ies"} · last ${fmt(s.last_at)}`),
          s.redo_id ? h("a", { class: "btn small primary", href: redoHref(s), onclick: (e) => e.stopPropagation() }, "Redo")
            : h("span", { class: "hint-text", title: "That prompt isn't in a plan any more" }, "Can't redo"))),
      body);
    return d;
  }

  async function loadTries(s, body) {
    if (body.dataset.loaded) return;
    try {
      full[s.key] = full[s.key] || await fetch(`/api/history/${encodeURIComponent(s.key)}`).then((r) => { if (!r.ok) throw new Error("load failed"); return r.json(); });
    } catch { body.replaceChildren(h("p", { class: "hint-text" }, "Couldn't load the tries.")); return; }
    body.dataset.loaded = "1";
    const doc = full[s.key];
    const trend = scoreTrend(doc.tries);
    body.replaceChildren(
      s.leetcode_url ? h("p", {}, h("a", { href: s.leetcode_url, target: "_blank", rel: "noopener noreferrer" }, "Open on LeetCode")) : null,
      trend,
      ...[...doc.tries].reverse().map((t) => tryView(s, t)));
  }

  // Each review score across tries, e.g. Correctness 1 → 3 → 4.
  function scoreTrend(tries) {
    const names = { correctness: "Correctness", efficiency: "Efficiency", code_quality: "Code quality", edge_cases: "Edge cases" };
    const rows = Object.entries(names).map(([k, name]) => {
      const vals = tries.map((t) => (t.review && t.review.scores ? t.review.scores[k] : null)).filter((v) => v != null);
      return vals.length > 0 ? h("div", { class: "score" }, h("span", {}, name), h("b", {}, vals.join(" → "))) : null;
    }).filter(Boolean);
    return rows.length ? h("div", { class: "scores trend" }, rows) : null;
  }

  function tryView(s, t) {
    const rv = t.review;
    const run = t.run && t.run.total ? `${t.run.passed}/${t.run.total} tests` : t.run && t.run.compiled === false ? "didn't run" : "";
    const meta = [fmt(t.at), t.minutes ? `${t.minutes} min` : "", t.hints ? `${t.hints} hints` : "", run,
      t.language ? LANGS[t.language] || t.language : "", READS[t.read] || ""].filter(Boolean).join(" · ");
    return h("details", { class: "try" },
      h("summary", {}, h("b", {}, `Try ${t.n}`), rv && rv.verdict ? h("span", { class: vClass(rv.verdict) }, rv.verdict) : null,
        h("span", { class: "hint-text" }, meta)),
      h("div", { class: "try-body" },
        rv ? h("p", {}, rv.summary) : null,
        rv && rv.scores ? h("p", { class: "hint-text" }, Object.entries(rv.scores).map(([k, v]) => `${k.replace("_", " ")} ${v}/4`).join(" · ")) : null,
        rv && rv.time_complexity ? h("p", { class: "hint-text" }, `Time ${rv.time_complexity}. Space ${rv.space_complexity}.` + (rv.optimal ? " Optimal." : rv.better_approach ? " Better: " + rv.better_approach : "")) : null,
        rv && rv.bugs && rv.bugs.length ? h("ul", {}, rv.bugs.map((b) => h("li", {}, `Line ${b.line}: ${b.issue}` + (b.fix ? ` Fix: ${b.fix}` : "")))) : null,
        rv && rv.edge_cases_missed && rv.edge_cases_missed.length ? h("p", { class: "hint-text" }, "Missed: " + rv.edge_cases_missed.join("; ")) : null,
        t.debrief ? h("div", { class: "rev-sec" }, h("b", {}, "Debrief"), h("p", {}, t.debrief)) : null,
        t.code ? h("pre", { class: "try-code" }, t.code) : null,
        t.diagram ? h("div", { class: "rev-sec" }, h("b", {}, "Diagram (Mermaid)"), h("pre", { class: "try-code" }, t.diagram)) : null,
        t.board_notes ? h("div", { class: "rev-sec" }, h("b", {}, "Board notes"), h("p", { style: "white-space:pre-wrap" }, t.board_notes)) : null,
        h("div", { class: "try-acts" },
          t.code && s.redo_id && s.kind === "coding" ? h("a", { class: "btn small", href: redoHref(s, t.n) }, `Redo from try ${t.n}'s code`) : null,
          h("button", { class: "btn small ghost", type: "button", onclick: () => removeTry(s, t) }, "Delete this try"))));
  }

  async function removeTry(s, t) {
    if (!confirm(`Delete try ${t.n} of “${s.title}”? This can't be undone.`)) return;
    const r = await fetch(`/api/history/${encodeURIComponent(s.key)}/tries/${t.n}`, { method: "DELETE" });
    if (!r.ok) { alert("Couldn't delete that try."); return; }
    delete full[s.key];
    await load();
  }

  async function load() {
    try { all = await fetch("/api/history").then((r) => r.json()); }
    catch { $("hist-list").replaceChildren(h("p", { class: "hint-text" }, "Couldn't load your history. Is the server running?")); return; }
    const companies = [...new Set(all.flatMap((s) => s.companies))].sort();
    const sel = $("f-company"), cur = sel.value;
    sel.replaceChildren(h("option", { value: "" }, "Any"), ...companies.map((c) => h("option", { value: c }, c)));
    sel.value = companies.includes(cur) ? cur : "";
    render();
  }

  $("kinds").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-kind]");
    if (!b) return;
    kind = b.dataset.kind;
    $("kinds").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  });
  for (const id of ["f-company", "f-redo"]) $(id).addEventListener("change", render);
  $("f-q").addEventListener("input", render);
  window.addEventListener("hashchange", render);
  load();
})();
