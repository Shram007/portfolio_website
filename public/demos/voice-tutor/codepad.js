// Code pad for coding rounds: a CodeMirror editor whose contents the interviewer sees each turn,
// Run tests (Python, on the local server) and Submit for review (graded by Claude).
// app.js owns the WebSocket; it calls CodePad.init({ send, ready }) once and forwards messages.
window.CodePad = (() => {
  const $ = (id) => document.getElementById(id);
  const MODES = { python: "python", java: "text/x-java", cpp: "text/x-c++src", javascript: "javascript" };
  const LANG_NAMES = { python: "Python", java: "Java", cpp: "C++", javascript: "JavaScript" };
  let send = () => {};
  let ready = () => false;
  let problem = null;
  let lang = "python";
  let cm = null;
  let sendTimer = null;
  let busy = { run: false, review: false };
  let lastRun = null;
  let lastReview = null;
  let loading = false;

  // ---------- editor (CodeMirror, or the plain textarea if it didn't load) ----------
  function makeEditor() {
    const ta = $("code-src");
    if (window.CodeMirror) {
      cm = CodeMirror.fromTextArea(ta, {
        mode: MODES[lang], lineNumbers: true, indentUnit: 4, tabSize: 4, indentWithTabs: false,
        matchBrackets: true, autoCloseBrackets: true, lineWrapping: false, viewportMargin: Infinity,
        extraKeys: {
          Tab: (ed) => (ed.somethingSelected() ? ed.indentSelection("add") : ed.replaceSelection(" ".repeat(ed.getOption("indentUnit")))),
          "Shift-Tab": (ed) => ed.indentSelection("subtract"),
          "Ctrl-Enter": () => run(), "Cmd-Enter": () => run(),
        },
      });
      cm.on("change", onEdit);
    } else {
      ta.classList.add("plain");
      ta.addEventListener("input", onEdit);
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); ta.setRangeText("    ", ta.selectionStart, ta.selectionEnd, "end"); onEdit(); }
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
      });
    }
  }
  const getCode = () => (cm ? cm.getValue() : $("code-src").value);
  function setCode(v) {
    loading = true;
    if (cm) { cm.setValue(v); cm.clearHistory(); } else $("code-src").value = v;
    loading = false;
  }

  // ---------- drafts: kept per problem and language in this browser ----------
  const draftKey = (l) => `vt-code:${problem ? problem.id : "none"}:${l}`;
  function loadDraft(l) { try { return localStorage.getItem(draftKey(l)); } catch { return null; } }
  function saveDraft() { try { localStorage.setItem(draftKey(lang), getCode()); } catch { /* private mode */ } }

  function starter(l) {
    const py = (problem && problem.starter) || "def solve():\n    pass\n";
    if (l === "python") return py;
    const m = py.match(/def\s+(\w+)\s*\(([^)]*)\)/);
    const fn = m ? m[1] : "solve";
    const args = m ? m[2].split(",").map((s) => s.trim()).filter(Boolean) : [];
    const camel = fn.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (l === "javascript") return `function ${camel}(${args.join(", ")}) {\n    \n}\n`;
    if (l === "java") return `class Solution {\n    // Fill in the types.\n    public Object ${camel}(${args.map((a) => "Object " + a).join(", ")}) {\n        \n    }\n}\n`;
    return `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    // Fill in the types.\n    auto ${camel}(${args.map((a) => "auto " + a).join(", ")}) {\n        \n    }\n};\n`;
  }

  function onEdit() {
    if (loading) return;
    saveDraft();
    clearTimeout(sendTimer);
    sendTimer = setTimeout(sendCode, 600);
  }
  function sendCode() {
    if (!ready()) return;
    send({ type: "code", code: getCode(), language: lang });
  }

  function setLang(l) {
    saveDraft();
    lang = l;
    $("code-lang").value = l;
    if (cm) cm.setOption("mode", MODES[l]);
    setCode(loadDraft(l) ?? starter(l));
    updateButtons();
    sendCode();
  }

  function updateButtons() {
    const run = $("btn-run");
    run.disabled = busy.run || lang !== "python";
    run.title = lang === "python" ? "Run against the test cases (Ctrl+Enter)" : "Running works for Python. Submit for review works for every language.";
    run.textContent = busy.run ? "Running…" : "Run tests";
    $("btn-review").disabled = busy.review;
    $("btn-review").textContent = busy.review ? "Reviewing…" : "Submit for review";
  }
  const state = (t) => { $("pad-state").textContent = t; };

  // ---------- run ----------
  function run() {
    if (lang !== "python" || busy.run || !ready()) return;
    busy.run = true; updateButtons(); state("Running your code locally…");
    send({ type: "run", code: getCode() });
  }

  const j = (v) => { try { return JSON.stringify(v); } catch { return String(v); } };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function showRun(r) {
    lastRun = r;
    busy.run = false; updateButtons(); state("");
    const out = $("run-out");
    out.hidden = false;
    const head = el("div", "run-h");
    if (!r.compiled || r.timed_out) {
      head.append(el("b", "bad", r.timed_out ? "Timed out" : "Didn't run"));
      out.replaceChildren(head, el("pre", "run-err", r.error));
      return;
    }
    const all = r.passed === r.total;
    head.append(el("b", all ? "ok" : "bad", `${r.passed} of ${r.total} tests passed`),
      el("span", "hint-text", all ? "Now talk through complexity, then Submit for review." : "Open a failing case to see what came back."));
    const list = el("div", "run-list");
    r.tests.forEach((t, i) => {
      const d = el("details", "run-case" + (t.ok ? " ok" : " bad"));
      if (!t.ok && !list.querySelector("details[open]")) d.open = true;
      const s = el("summary");
      s.append(el("span", "mark", t.ok ? "✓" : "✕"), el("span", "", `Case ${i + 1}`), el("code", "args", j(t.args).slice(0, 90)), el("span", "ms", t.ms + " ms"));
      const body = el("div", "run-body");
      const row = (k, v, cls) => { const p = el("div", "kv " + (cls || "")); p.append(el("span", "k", k), el("code", "", v)); body.append(p); };
      row("Input", j(t.args));
      row("Expected", j(t.expect));
      if (t.error) row("Error", t.error, "bad"); else row("Got", j(t.got), t.ok ? "" : "bad");
      if (t.stdout) row("Printed", t.stdout);
      d.append(s, body);
      list.append(d);
    });
    out.replaceChildren(head, list);
  }

  // ---------- review ----------
  function review() {
    if (busy.review || !ready()) return;
    if (!getCode().trim()) { state("Write some code first."); return; }
    busy.review = true; updateButtons(); state("Claude is reviewing your code. Usually under a minute…");
    send({ type: "review", code: getCode(), language: lang });
  }

  const SCORE_NAMES = { correctness: "Correctness", efficiency: "Efficiency", code_quality: "Code quality", edge_cases: "Edge cases" };
  function showReview(rv) {
    lastReview = rv;
    busy.review = false; updateButtons(); state("");
    const out = $("review-out");
    out.hidden = false;
    const head = el("div", "rev-h");
    const v = el("span", "verdict v-" + rv.verdict.toLowerCase().replace(/\s+/g, "-"), rv.verdict);
    head.append(el("b", "", "Review"), v, rv.tests ? el("span", "hint-text", `${rv.tests.passed} of ${rv.tests.total} tests passed`) : el("span", "hint-text", LANG_NAMES[rv.language] + ", not run"));
    const scores = el("div", "scores");
    for (const [k, name] of Object.entries(SCORE_NAMES)) {
      const n = (rv.scores || {})[k] || 0;
      const s = el("div", "score");
      const bar = el("span", "pips");
      for (let i = 1; i <= 4; i++) bar.append(el("i", i <= n ? "on" : ""));
      s.append(el("span", "", name), bar, el("b", "", n + "/4"));
      scores.append(s);
    }
    const sec = (title, items, fn) => {
      if (!items || !items.length) return null;
      const d = el("div", "rev-sec");
      const ul = el("ul");
      items.forEach((x) => ul.append(fn(x)));
      d.append(el("b", "", title), ul);
      return d;
    };
    const cx = el("div", "rev-sec");
    cx.append(el("b", "", "Complexity"), el("p", "", `Time ${rv.time_complexity}. Space ${rv.space_complexity}.` + (rv.optimal ? " That's optimal." : "")));
    if (!rv.optimal && rv.better_approach) cx.append(el("p", "better", "Better: " + rv.better_approach));
    const bugs = sec("Bugs", rv.bugs, (b) => {
      const li = el("li");
      const a = el("button", "line-link", "Line " + b.line);
      a.type = "button";
      a.addEventListener("click", () => { if (cm && b.line > 0) { cm.focus(); cm.setCursor({ line: b.line - 1, ch: 0 }); cm.scrollIntoView(null, 80); } });
      li.append(a, " " + b.issue + (b.fix ? " Fix: " + b.fix : ""));
      return li;
    });
    out.replaceChildren(...[head, el("p", "rev-sum", rv.summary), scores,
      (() => { const d = el("div", "rev-sec"); d.append(el("b", "", "Correctness"), el("p", "", rv.correctness)); return d; })(),
      cx, bugs,
      sec("Edge cases missed", rv.edge_cases_missed, (x) => el("li", "", x)),
      sec("Readability", rv.readability, (x) => el("li", "", x)),
      sec("Practise next", rv.next_steps, (x) => el("li", "", x))].filter(Boolean));
    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function onError(m) {
    busy[m.action] = false; updateButtons();
    state((m.action === "run" ? "Run" : "Review") + " failed: " + m.message);
  }

  // ---------- public ----------
  return {
    init(opts) {
      send = opts.send; ready = opts.ready;
      makeEditor();
      $("code-lang").addEventListener("change", (e) => setLang(e.target.value));
      $("btn-run").addEventListener("click", run);
      $("btn-review").addEventListener("click", review);
      $("btn-reset-code").addEventListener("click", () => {
        if (getCode().trim() && getCode() !== starter(lang) && !confirm("Replace your code with the starter?")) return;
        setCode(starter(lang)); saveDraft(); sendCode();
      });
      updateButtons();
    },
    // A coding session started (or the selection changed before one): show the pad with this problem's draft.
    show(p, on) {
      $("code-panel").hidden = !on;
      if (!on) return;
      const changed = !problem || problem.id !== p.id;
      problem = p;
      if (changed) {
        lastRun = lastReview = null;
        $("run-out").hidden = true; $("review-out").hidden = true;
        setCode(loadDraft(lang) ?? starter(lang));
      }
      if (cm) setTimeout(() => cm.refresh(), 0);
      busy = { run: false, review: false }; updateButtons(); state("");
      sendCode();
    },
    // Launched from the plan: start from the code saved with that task last time, if there's no newer draft.
    // force: replace the draft too (redo from an earlier try's code).
    // Returns false if the pad has no problem yet (call again once it does).
    prefill(code, language, force) {
      if (!code || !problem) return false;
      if (language && MODES[language] && language !== lang) { lang = language; $("code-lang").value = lang; if (cm) cm.setOption("mode", MODES[lang]); }
      if (force || loadDraft(lang) == null) { setCode(code); saveDraft(); sendCode(); }
      return true;
    },
    // "End, don't save": drop this session's test results and review from the pad (the code stays).
    clearResults() {
      lastRun = lastReview = null;
      $("run-out").hidden = true; $("review-out").hidden = true;
      busy = { run: false, review: false }; updateButtons(); state("");
    },
    // Forget the saved drafts for a problem, so the next session opens on the starter.
    clearDrafts(problemId) {
      for (const l of Object.keys(MODES)) { try { localStorage.removeItem(`vt-code:${problemId}:${l}`); } catch { /* private mode */ } }
      if (problem && problem.id === problemId) setCode(starter(lang));
    },
    handle(m) {
      if (m.type === "run_result") showRun(m.result);
      else if (m.type === "review_result") showReview(m.review);
      else if (m.type === "pad_error") onError(m);
      else return false;
      return true;
    },
    code: () => getCode(),
    // What gets saved to the plan with the task.
    result() {
      if ($("code-panel").hidden) return null;
      const r = { code: getCode().slice(0, 20000), language: lang };
      if (lastRun) r.run = { passed: lastRun.passed, total: lastRun.total, compiled: lastRun.compiled };
      if (lastReview) {
        const { verdict, summary, scores, time_complexity, space_complexity, optimal, better_approach, bugs, edge_cases_missed, next_steps } = lastReview;
        r.review = { verdict, summary, scores, time_complexity, space_complexity, optimal, better_approach, bugs, edge_cases_missed, next_steps };
      }
      return r;
    },
  };
})();
