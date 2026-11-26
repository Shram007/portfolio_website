// Renders Mermaid source into an element. Shared by the prep page (walkthrough diagrams)
// and the interview page (design board). Needs /vendor/mermaid.min.js loaded first.
// On a syntax error it shows the error and keeps the last good drawing, so typing never blanks the board.
(() => {
  "use strict";
  let ready = false;
  let seq = 0;

  function init() {
    if (ready || !window.mermaid) return !!window.mermaid;
    const dark = document.documentElement.dataset.theme === "dark" ||
      (document.documentElement.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    window.mermaid.initialize({
      startOnLoad: false, securityLevel: "strict", theme: dark ? "dark" : "default",
      fontFamily: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
      flowchart: { htmlLabels: false }, class: { htmlLabels: false },
    });
    ready = true;
    return true;
  }

  async function render(el, src, errEl) {
    const text = (src || "").trim();
    if (errEl) errEl.textContent = "";
    if (!text) { el.replaceChildren(); return true; }
    if (!init()) {
      const pre = document.createElement("pre");
      pre.className = "code";
      pre.textContent = text;
      el.replaceChildren(pre);
      return false;
    }
    try {
      await window.mermaid.parse(text);
      const { svg } = await window.mermaid.render("mmd-" + (++seq), text);
      el.innerHTML = svg; // Mermaid output with securityLevel "strict" is sanitized by Mermaid itself
      return true;
    } catch (e) {
      // Mermaid leaves an error node behind on failure; remove it.
      document.querySelectorAll('[id^="dmmd-"]').forEach((n) => n.remove());
      const msg = String((e && (e.str || e.message)) || e).split("\n").slice(0, 3).join(" ");
      if (errEl) errEl.textContent = "Diagram error: " + msg;
      else {
        const pre = document.createElement("pre");
        pre.className = "code";
        pre.textContent = text;
        el.replaceChildren(pre);
      }
      return false;
    }
  }

  window.Diagram = { render };
})();
