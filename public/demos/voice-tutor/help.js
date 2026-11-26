// Get help panel for coding rounds: moderated hints from the server (never the full solution),
// a concept look-up on the web, and a hint-only prompt to paste into another Claude session.
// app.js owns the WebSocket; it calls Help.init(...) once and forwards messages.
window.Help = (() => {
  const $ = (id) => document.getElementById(id);
  const NOT_COUNTED = { syntax: "syntax question", code_structure: "code-style question", concept_general: "general concept" };
  let opts = null;
  let busy = false;
  const thread = [];

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const state = (t) => { $("help-state").textContent = t; };
  function setBusy(on, what) {
    busy = on;
    for (const b of document.querySelectorAll("#help-panel button:not(#btn-help-copy)")) b.disabled = on;
    state(on ? what : "");
  }

  function ask(kind) {
    if (busy || !opts.ready()) { if (!opts.ready()) state("Start the interview first."); return; }
    const q = $("help-q").value.trim();
    if (kind === "ask" && !q) { state("Type a question, or use one of the buttons."); return; }
    if (kind === "search" && !q) { state("Type the concept to look up, e.g. topological sort."); return; }
    setBusy(true, kind === "search" ? "Looking it up…" : "Thinking of a pointer (checked so it doesn't give the answer away)…");
    opts.send({ type: "help", kind, question: q, code: opts.getCode() });
  }

  function render() {
    $("help-thread").replaceChildren(...[...thread].reverse().map((e) => {
      const li = el("li", "help-item");
      const head = el("div", "help-q");
      head.append(el("b", "", e.kind === "search" ? "Looked up: " : "You: "), e.question);
      const tag = e.kind === "search" ? el("span", "tag", "not a hint")
        : e.counted ? el("span", "tag counted", "counted as a hint")
        : el("span", "tag", "not counted" + (NOT_COUNTED[e.category] ? ` (${NOT_COUNTED[e.category]})` : ""));
      head.append(" ", tag, e.at ? el("span", "hint-text", " " + e.at) : "");
      const a = el("p", "help-a", e.answer);
      li.append(head, a);
      if (e.links && e.links.length) {
        const ul = el("ul", "help-links");
        for (const l of e.links) {
          const x = el("a", "", l.title || l.url);
          x.href = l.url; x.target = "_blank"; x.rel = "noopener noreferrer";
          const item = el("li"); item.append(x); ul.append(item);
        }
        li.append(ul);
      }
      return li;
    }));
  }

  // A prompt for any other Claude session, with the same hint-only rules (and no secret reference).
  async function copyPrompt() {
    const p = opts.getProblem();
    if (!p) { state("Pick a coding problem first."); return; }
    const q = $("help-q").value.trim();
    const text = [
      "You're my coding-interview tutor. Help me get unstuck WITHOUT solving the problem for me.",
      "Rules: answer only my specific question, in 1-3 sentences. Give a pointer, a small counterexample, or which line of my code to look at. Never write the solution or describe the full algorithm. No code except a line or two of generic syntax if I ask about syntax. If I ask for the whole solution, ask me which step I'm stuck on instead.",
      "", `Problem: ${p.title}`, p.statement || "", p.example ? "Example:\n" + p.example : "",
      "", "My code so far:", "```", opts.getCode() || "(nothing yet)", "```",
      "", "My question: " + (q || "(I'll ask next)"),
    ].join("\n");
    try { await navigator.clipboard.writeText(text); state("Copied. Paste it into any Claude session: it's set up to give hints only."); }
    catch { state("Couldn't copy. Your browser blocked the clipboard."); }
  }

  return {
    init(o) {
      opts = o;
      document.querySelectorAll("#help-panel [data-help]").forEach((b) => b.addEventListener("click", () => ask(b.dataset.help)));
      $("btn-help-ask").addEventListener("click", () => ask("ask"));
      $("btn-help-search").addEventListener("click", () => ask("search"));
      $("btn-help-copy").addEventListener("click", copyPrompt);
      $("help-q").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask("ask"); } });
    },
    // A new session (or problem): show for coding, start a fresh thread.
    show(on, problemId) {
      $("help-panel").hidden = !on;
      if (this.problemId !== problemId) { thread.length = 0; render(); }
      this.problemId = problemId;
      setBusy(false);
    },
    handle(m) {
      if (m.type === "help_result") {
        thread.push(m.entry);
        $("help-q").value = "";
        setBusy(false);
        render();
        if (m.state && opts.onState) opts.onState(m.state);
        return true;
      }
      if (m.type === "pad_error" && m.action === "help") { setBusy(false); state("Help failed: " + m.message); return true; }
      return false;
    },
  };
})();
