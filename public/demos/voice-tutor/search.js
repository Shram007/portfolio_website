// Global problem search in the app bar (every page): problems you already have, LeetCode
// problems found on the web, or a random pick. Add one to your library, then practise it.
(() => {
  const bar = document.querySelector(".appbar");
  if (!bar) return;
  const DIFFS = ["Easy", "Medium", "Hard"];

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
  async function api(method, path, body) {
    const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.detail || `Request failed (${r.status})`);
    return data;
  }
  const practiceHref = (id, title) => "./index.html?" + new URLSearchParams({ problem: id, label: title }).toString();

  const q = h("input", { type: "search", placeholder: "Search problems…", "aria-label": "Search problems", autocomplete: "off" });
  const pop = h("div", { class: "gs-pop", role: "dialog", "aria-label": "Problem search", hidden: true });
  const wrap = h("div", { class: "gsearch" }, q,
    h("button", { class: "btn small", type: "button", title: "Pick a random problem you haven't done", onclick: () => { open(); showRandom(); } }, "Random"),
    pop);
  bar.append(wrap);

  const local = h("div", { class: "gs-sec" });
  const web = h("div", { class: "gs-sec" });
  const rand = h("div", { class: "gs-sec" });
  pop.append(local, web, rand);

  function open() { pop.hidden = false; }
  function close() { pop.hidden = true; }
  document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !pop.hidden) { close(); q.blur(); }
    if (e.key === "/" && document.activeElement === document.body) { e.preventDefault(); q.focus(); }
  });

  // One web or random result: add it to the library, then practise it.
  function resultRow(r) {
    const act = h("span", { class: "gs-act" });
    const practice = (id) => act.replaceChildren(h("a", { class: "btn small primary", href: practiceHref(id, r.title) }, "Practise"));
    if (r.lib_id) practice(r.lib_id);
    else {
      const add = h("button", { class: "btn small", type: "button", onclick: async () => {
        add.disabled = true; add.textContent = "Adding… (writing its card)";
        try { const e = await api("POST", "/api/library", { slug: r.slug, title: r.title, difficulty: r.difficulty, pattern: r.pattern }); practice(e.id); }
        catch (err) { add.disabled = false; add.textContent = "Add"; act.append(h("span", { class: "gs-err" }, " " + err.message)); }
      } }, "Add to Voice Tutor");
      act.append(add);
    }
    return h("li", { class: "gs-item" },
      h("div", {}, h("a", { href: r.leetcode_url, target: "_blank", rel: "noopener noreferrer" }, r.title), " ",
        h("span", { class: "diff " + String(r.difficulty).toLowerCase() }, r.difficulty), " ",
        r.pattern ? h("span", { class: "hint-text" }, r.pattern) : null, r.have ? h("span", { class: "tag" }, "you have it") : null),
      r.why ? h("div", { class: "hint-text" }, r.why.length > 160 ? r.why.slice(0, 157) + "…" : r.why) : null,
      act);
  }

  let timer = null;
  let seq = 0;
  async function runLocal() {
    const text = q.value.trim();
    rand.replaceChildren();
    if (!text) {
      local.replaceChildren(h("p", { class: "hint-text" }, "Type a title, topic or difficulty, e.g. \"graph medium\". Or press Random."));
      web.replaceChildren();
      return;
    }
    const my = ++seq;
    let hits = [];
    try { hits = await api("GET", "/api/search?q=" + encodeURIComponent(text)); } catch { /* show none */ }
    if (my !== seq) return;
    local.replaceChildren(h("b", { class: "gs-h" }, "You have"),
      hits.length ? h("ul", {}, hits.map((p) => h("li", { class: "gs-item" },
        h("a", { href: practiceHref(p.id, p.title) }, p.title), " ",
        p.difficulty ? h("span", { class: "diff " + p.difficulty.toLowerCase() }, p.difficulty) : null, " ",
        h("span", { class: "hint-text" }, [p.pattern, p.where].filter(Boolean).join(" · ")))))
        : h("p", { class: "hint-text" }, "Nothing you have matches."));
    web.replaceChildren(h("button", { class: "btn small", type: "button", onclick: () => runWeb(text) }, `Search LeetCode for “${text}”`));
  }
  async function runWeb(text) {
    web.replaceChildren(h("b", { class: "gs-h" }, "On LeetCode"), h("p", { class: "hint-text" }, "Searching the web… (10 to 30 seconds)"));
    try {
      const res = await api("POST", "/api/search/web", { q: text });
      web.replaceChildren(h("b", { class: "gs-h" }, "On LeetCode"),
        res.length ? h("ul", {}, res.map(resultRow)) : h("p", { class: "hint-text" }, "No LeetCode problems found."));
    } catch (e) { web.replaceChildren(h("b", { class: "gs-h" }, "On LeetCode"), h("p", { class: "gs-err" }, e.message)); }
  }

  async function showRandom() {
    local.replaceChildren(); web.replaceChildren();
    let companies = [];
    try { companies = await api("GET", "/api/prep/companies"); } catch { /* none */ }
    const diff = h("select", { "aria-label": "Difficulty" }, h("option", { value: "" }, "Any difficulty"), DIFFS.map((d) => h("option", { value: d }, d)));
    const pattern = h("input", { placeholder: "Topic (optional), e.g. graphs", "aria-label": "Topic" });
    const company = h("select", { "aria-label": "Company" }, h("option", { value: "" }, "Any company"), companies.map((c) => h("option", { value: c.name }, c.name)));
    const out = h("div", {});
    const go = h("button", { class: "btn small primary", type: "submit" }, "Pick one");
    rand.replaceChildren(h("b", { class: "gs-h" }, "Random problem you haven't done"),
      h("form", { class: "gs-rand", onsubmit: async (e) => {
        e.preventDefault();
        go.disabled = true; go.textContent = "Picking…";
        out.replaceChildren(h("p", { class: "hint-text" }, "Searching for a good one (10 to 30 seconds)…"));
        try { const r = await api("POST", "/api/search/random", { difficulty: diff.value, pattern: pattern.value, company: company.value }); out.replaceChildren(h("ul", {}, resultRow(r))); }
        catch (err) { out.replaceChildren(h("p", { class: "gs-err" }, err.message)); }
        go.disabled = false; go.textContent = "Pick another";
      } }, diff, pattern, company, go), out);
  }

  q.addEventListener("focus", () => { open(); if (!rand.firstChild) runLocal(); });
  q.addEventListener("input", () => { open(); clearTimeout(timer); timer = setTimeout(runLocal, 200); });
  q.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); const t = q.value.trim(); if (t) runWeb(t); } });
})();
