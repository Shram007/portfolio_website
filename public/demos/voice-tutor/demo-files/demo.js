// The demo's pretend server. The real Voice Tutor talks to a FastAPI server on my PC over fetch and a
// WebSocket: Whisper hears the candidate, Claude plays the interviewer, Piper speaks, a sandbox runs the
// code. This file stands in for all of it, inside the page: fetch and WebSocket are replaced before the
// app's scripts run, the interviewer follows a script, test runs and reviews are recorded, and the
// history lives in this browser. Nothing is sent anywhere. The one exception is the mic: holding Space
// uses the browser's own speech recognition, which the browser may run on its maker's servers.
(() => {
  "use strict";
  const S = window.__DEMO_SERVER__;
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
  const norm = (t) => " " + String(t || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9()^%]+/g, " ").trim() + " ";
  const has = (t, words) => words.some((w) => t.includes(w));
  const count = (t, re) => (t.match(re) || []).length;
  const asksSomething = (text) => /\?\s*$/.test(text.trim()) || /^(can|could|is|are|do|does|will|what|how|should|may|would|any)\b/i.test(text.trim());
  const sentences = (text) => text.split(/(?<=[.?!])\s+(?=[A-Z0-9"'(])/).filter(Boolean);

  // ---------- what the pretend server knows ----------
  const PROBLEMS = S.problems;
  const BY_ID = Object.fromEntries(PROBLEMS.map((p) => [p.id, p]));
  const DESIGNS = Object.fromEntries(S.designs.map((d) => [d.id, d]));
  const PUBLIC = ["id", "title", "difficulty", "statement", "example", "fn", "starter"];
  const publicCard = (p) => Object.fromEntries(PUBLIC.map((k) => [k, p[k]]));
  const PATTERNS = { "two-sum": "Arrays and hashing", "valid-parens": "Stack", "longest-substring": "Sliding window", "merge-intervals": "Intervals" };

  // The script for each built-in problem: what the interviewer answers, listens for and asks.
  const linear = (t) => /\bo\s*\(\s*n\s*\)|linear|\bo of n\b|\bbig o n\b|\border n\b/.test(t) && !/log|squared|\^ ?2|n2\b|cubed|quadratic/.test(t);
  const SCRIPTS = {
    "two-sum": {
      faq: [
        [["negative", "zero"], "Yes, numbers can be negative, and zero can show up too."],
        [["duplicate", "repeat", "same number", "same value", "twice", "same element", "same index"], "Values can repeat, but you can't use the same index twice."],
        [["sorted", "order"], "No, the array isn't sorted, and you can return the two indices in any order."],
        [["one solution", "exactly one", "no solution", "more than one", "multiple", "always"], "There's always exactly one valid pair, so you don't need to handle none."],
        [["empty", "size", "length", "how big", "how many", "large", "constraint"], "There are at least two numbers, and up to about ten thousand."],
      ],
      key: ["hash", "map", "dict", "set", "complement", "look up", "lookup", "seen", "remember"],
      brute: ["brute", "nested", "two loops", "every pair", "all pairs", "each pair", "n squared", "double loop"],
      bruteAck: "That works. Checking every pair is O of n squared, though. What work does it repeat?",
      keyAck: "A map from value to index gets you there in one pass.",
      goal: "the partner for each number",
      code: [/\{\s*\}|dict\(|seen|in\s+\w+/, "I can see the lookup in your code."],
      edge: "What does your code do with nums equal to three, three and a target of six?",
      right: linear, complexity: "O of n time for the one pass, and O of n space for the map",
    },
    "valid-parens": {
      faq: [
        [["empty"], "An empty string counts as valid."],
        [["character", "letters", "other", "only brackets", "types"], "Only the six bracket characters: round, square and curly."],
        [["nest", "inside"], "Yes, brackets can nest, like a square pair inside a round pair."],
        [["length", "size", "how long", "constraint"], "Up to about ten thousand characters."],
      ],
      key: ["stack", "push", "pop", "last opened", "most recent", "last in"],
      brute: ["brute", "replace", "remove pairs", "count", "counter"],
      bruteAck: "Counting alone breaks on something like round, square, close round, close square. What would catch the order?",
      keyAck: "A stack matches each closing bracket with the most recent opening one.",
      goal: "which opening bracket a closing one belongs to",
      code: [/append\(|\.pop\(|stack/, "I can see the stack in your code."],
      edge: "What happens with a closing bracket on its own, or two opening brackets that never close?",
      right: linear, complexity: "O of n time for one pass, and O of n space for the stack",
    },
    "longest-substring": {
      faq: [
        [["empty"], "For an empty string, return zero."],
        [["case", "upper", "lower", "capital"], "It's case-sensitive, so lower and upper case letters are different."],
        [["character", "letters", "digits", "spaces", "symbols"], "Letters, digits, symbols and spaces can all appear."],
        [["subsequence", "contiguous"], "It has to be a contiguous substring, not a subsequence."],
        [["length", "size", "how long", "constraint"], "Up to about fifty thousand characters."],
      ],
      key: ["window", "sliding", "two pointer", "left and right", "last seen", "last index", "start pointer"],
      brute: ["brute", "every substring", "all substrings", "each substring", "nested", "n cubed", "n squared"],
      bruteAck: "Checking every substring works, but it's at least O of n squared. What are you recomputing each time?",
      keyAck: "A sliding window whose left edge jumps past the repeat keeps it to one pass.",
      goal: "where the current run of unique characters starts",
      code: [/max\(|left|start|last|window/, "I can see the window bounds in your code."],
      edge: "What does your code return for a, b, b, a?",
      right: linear, complexity: "O of n time, and space bounded by the alphabet for the map",
    },
    "merge-intervals": {
      faq: [
        [["sorted", "order"], "No, the intervals aren't sorted."],
        [["touch", "adjacent", "equal", "same point", "share"], "Yes, intervals that just touch, like one to four and four to five, merge into one to five."],
        [["empty", "how many", "size", "constraint"], "There's at least one interval, and up to about ten thousand."],
        [["in place", "modify", "new list"], "Returning a new list is fine."],
      ],
      key: ["sort", "start time", "by start", "sweep"],
      brute: ["brute", "every pair", "each pair", "all pairs", "nested", "compare each"],
      bruteAck: "Comparing every pair works, but it gets messy when merges chain together. Is there an order that makes it easier?",
      keyAck: "Sorting by start puts everything that could overlap side by side.",
      goal: "which intervals can overlap",
      code: [/sort/, "I can see you sort first."],
      edge: "What about one to four and four to five, where they just touch?",
      right: (t) => /log/.test(t), complexity: "O of n log n time for the sort, and O of n space for the output",
    },
  };

  const REQUIREMENTS = {
    "design:general:parking-lot": "Several levels, cars, motorcycles and trucks, hourly pricing, one entrance and one exit.",
    "design:general:lru-cache": "Capacity is set when you create it, keys and values are strings, and the time to live is optional per entry.",
    "design:general:url-shortener": "About a hundred million new links a month, reads far outnumber writes, and links never expire unless deleted.",
    "design:general:news-feed": "About fifty million daily users, people follow up to a few thousand accounts, and the feed should load fast.",
  };
  const DESIGN_ASK = {
    use_cases: () => "What are the main use cases?",
    classes: () => "What classes would you start with, and how do they relate? Sketch them on the board if it helps.",
    code: () => "Pick the most important method and talk me through it.",
    extend: (d) => `Now let's talk about ${d.problem.focus[d.problem.focus.length - 1]}. What changes in your design?`,
    estimates: () => "Give me rough numbers: requests per second, reads versus writes, and storage.",
    api: () => "What does the API look like, and what do you store?",
    high_level: () => "Draw the high-level design on the board and walk me through one request.",
    deep_dive: (d) => `Let's go deeper on ${d.problem.focus[1] || d.problem.focus[0]}.`,
    tradeoffs: () => "What trade-offs did you make, and what would you change at ten times the traffic?",
    interfaces: () => "What are the interfaces between the parts?",
    implement: () => "How would you build it, step by step?",
    failures: () => "What fails, and how does the system behave when it does?",
    wrap: () => "Good, that's time from my side. Press Finish and debrief whenever you're ready.",
  };
  const GREET = {
    friendly: "Hi, thanks for joining! Take your time and think out loud.",
    neutral: "Hi, let's get started.",
    tough: "Let's begin. We have a lot to cover.",
  };
  const LABELS = { clarify: "clarifying", approach: "the approach", code: "coding", test: "testing", complexity: "complexity", wrap: "the wrap-up" };

  // ---------- recorded reviews ----------
  const REVIEWS = {
    "two-sum": { summary: "Correct one-pass hash map solution with clear names. It handles duplicates because it checks before storing.",
      correctness: "Returns the right pair on every case, including repeated values and negatives.", time_complexity: "O(n)", space_complexity: "O(n)",
      readability: ["Names are clear. A one-line comment on why you check before inserting would help a reader."],
      next_steps: ["Three Sum, to extend the idea with sorting and two pointers."] },
    "valid-parens": { summary: "Clean stack solution that checks the order of brackets, not just their counts.",
      correctness: "Handles nesting, a lone closing bracket and unclosed openings.", time_complexity: "O(n)", space_complexity: "O(n)",
      readability: ["The pairs map reads well. Returning early on a mismatch keeps it simple."],
      next_steps: ["Daily Temperatures, for a monotonic stack."] },
    "longest-substring": { summary: "Sliding window that jumps the left edge past the last repeat, so each character is seen once.",
      correctness: "Right on repeats inside the window and on repeats that are already outside it, like a, b, b, a.", time_complexity: "O(n)", space_complexity: "O(min(n, alphabet))",
      readability: ["The check against start is the subtle line. Say out loud why it's there."],
      next_steps: ["Minimum Window Substring, for a window that has to cover a target."] },
    "merge-intervals": { summary: "Sort by start, then extend or append. Short and correct.",
      correctness: "Merges overlapping and touching intervals, and keeps separate ones apart.", time_complexity: "O(n log n)", space_complexity: "O(n)",
      readability: ["Unpacking each interval into start and end makes the condition easy to read."],
      next_steps: ["Insert Interval, then Meeting Rooms II."] },
  };
  const hasReturn = (code) => /\breturn\b/.test(code || "");

  // ---------- practice history: made-up tries, plus what you do here (kept in this browser) ----------
  const HKEY = "vt-demo-history-v1";
  const daysAgo = (n, h = 19) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 10, 0, 0); return d.toISOString(); };
  const docFor = (key, kind, title, extra) => ({ key, kind, title, difficulty: "", pattern: "", leetcode_url: "", companies: [], problem_id: "", tries: [], ...extra });
  function baseHistory() {
    const two = BY_ID["two-sum"], longest = BY_ID["longest-substring"];
    const pl = DESIGNS["design:general:parking-lot"];
    const docs = {};
    docs[two.history_key] = docFor(two.history_key, "coding", two.title, {
      difficulty: two.difficulty, pattern: PATTERNS["two-sum"], leetcode_url: two.leetcode_url, problem_id: "two-sum",
      tries: [
        { n: 1, at: daysAgo(6), mode: "coding", read: "stuck", hints: 2, minutes: 31, language: "python",
          run: { passed: 3, total: 5, compiled: true, timed_out: false },
          code: "def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n",
          review: { verdict: "Lean no", scores: { correctness: 2, efficiency: 1, code_quality: 3, edge_cases: 2 },
            summary: "Brute force that pairs an element with itself, so it fails when one number is half the target.",
            time_complexity: "O(n^2)", space_complexity: "O(1)", optimal: false, better_approach: "One pass with a hash map from value to index.",
            bugs: [{ line: 3, issue: "j starts at i, so the same index can be used twice.", fix: "Start j at i + 1." }], edge_cases_missed: ["nums = [3, 2, 4], target 6"] } },
        { n: 2, at: daysAgo(2), mode: "coding", read: "done", hints: 0, minutes: 18, language: "python",
          run: { passed: 5, total: 5, compiled: true, timed_out: false },
          code: "def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n",
          review: { verdict: "Hire", scores: { correctness: 4, efficiency: 4, code_quality: 3, edge_cases: 3 }, summary: REVIEWS["two-sum"].summary,
            time_complexity: "O(n)", space_complexity: "O(n)", optimal: true, bugs: [], edge_cases_missed: [] },
          debrief: "This would pass. You asked about duplicates before coding and moved from brute force to the hash map on your own. Next time, state the space cost without being asked." },
      ] });
    docs[longest.history_key] = docFor(longest.history_key, "coding", longest.title, {
      difficulty: longest.difficulty, pattern: PATTERNS["longest-substring"], leetcode_url: longest.leetcode_url, problem_id: "longest-substring",
      tries: [{ n: 1, at: daysAgo(1), mode: "coding", read: "stuck", hints: 3, minutes: 40, language: "python",
        run: { passed: 5, total: 7, compiled: true, timed_out: false },
        code: "def length_of_longest_substring(s):\n    seen = set()\n    best = 0\n    for ch in s:\n        if ch in seen:\n            seen = set()\n        seen.add(ch)\n        best = max(best, len(seen))\n    return best\n",
        review: { verdict: "Lean no", scores: { correctness: 2, efficiency: 3, code_quality: 3, edge_cases: 1 },
          summary: "Resets the whole set on a repeat, which drops characters that should stay in the window.",
          time_complexity: "O(n)", space_complexity: "O(n)", optimal: false, better_approach: "Move the left edge to just past the last time the repeated character appeared.",
          bugs: [{ line: 6, issue: "Clearing the set forgets the part of the window after the repeat.", fix: "Track each character's last index and move a start pointer." }],
          edge_cases_missed: ["dvdf should be 3"] } }] });
    docs[S.behavioral.history_key] = docFor(S.behavioral.history_key, "behavioral", S.behavioral.title, {
      problem_id: "behavioral:general",
      tries: [{ n: 1, at: daysAgo(3), mode: "behavioral", read: "on_track", minutes: 14, turns: 8,
        debrief: "Clear situations and real results. In two stories you said we for the key decisions, so make your own part plainer." }] });
    docs[pl.history_key] = docFor(pl.history_key, "design", pl.title, {
      problem_id: pl.id,
      tries: [{ n: 1, at: daysAgo(4), mode: "design", read: "on_track", minutes: 38, turns: 11,
        diagram: "classDiagram\n  ParkingLot --> Level\n  Level --> Spot\n  Ticket --> Spot\n  Vehicle <|-- Car\n  Vehicle <|-- Truck",
        board_notes: "Spot sizes: small, medium, large\nTicket: issued_at, spot, vehicle\nprice = hours x rate",
        debrief: "Good requirements and a clean class split. You didn't get to payment on exit, and the extension to new vehicle types needs a word on where sizing lives." }] });
    return docs;
  }
  let HIST = null;
  function store() {
    if (HIST) return HIST;
    try { HIST = JSON.parse(localStorage.getItem(HKEY) || "null"); } catch { HIST = null; }
    if (!HIST || typeof HIST !== "object") HIST = baseHistory();
    return HIST;
  }
  function persist() { try { localStorage.setItem(HKEY, JSON.stringify(HIST)); } catch { /* private window: this tab only */ } }
  const WEAK = ["Lean no", "No hire"], WEAK_READS = ["stuck", "wrong_direction"];
  function summary(doc) {
    const order = ["No hire", "Lean no", "Hire", "Strong hire"];
    const tries = doc.tries.map((t) => {
      const rv = t.review || {};
      return { n: t.n, at: t.at, verdict: rv.verdict || "", scores: rv.scores || null, read: t.read, hints: t.hints, minutes: t.minutes,
        tests: t.run || null, language: t.language, has_code: !!t.code, finished: !!t.debrief };
    });
    const verdicts = tries.map((t) => t.verdict).filter((v) => order.includes(v));
    const last = doc.tries[doc.tries.length - 1] || {};
    const run = last.run || {};
    return { key: doc.key, kind: doc.kind, title: doc.title, difficulty: doc.difficulty, pattern: doc.pattern, leetcode_url: doc.leetcode_url,
      companies: doc.companies || [], count: tries.length, last_at: tries.length ? tries[tries.length - 1].at : null,
      best_verdict: verdicts.length ? verdicts.reduce((a, b) => (order.indexOf(b) > order.indexOf(a) ? b : a)) : "",
      needs_redo: !!(doc.tries.length && (WEAK.includes((last.review || {}).verdict) || WEAK_READS.includes(last.read) || (run.total && run.passed < run.total))),
      redo_id: doc.problem_id, tries };
  }

  // ---------- fetch: the server's routes, answered here ----------
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const notHere = (what) => json({ detail: `${what} needs the real app, which runs on my PC.` }, 400);
  function route(method, path, query, body) {
    if (method === "GET" && path === "/api/problems") return json(PROBLEMS.map(publicCard));
    if (method === "GET" && path === "/api/coding-card") {
      const p = BY_ID[query.get("problem") || ""];
      return p ? json({ ...publicCard(p), id: p.id }) : json({ detail: "That problem isn't in this demo." }, 404);
    }
    if (method === "GET" && path === "/api/designs") return json(S.designs.map(({ id, title, kind }) => ({ id, title, kind })));
    if (method === "GET" && path === "/api/library") return json([]);
    if (method === "POST" && path === "/api/library") return notHere("Adding problems to your library");
    if (method === "GET" && path === "/api/prep/status") return json({ research: true, brain: "claude" });
    if (method === "GET" && path === "/api/prep/companies") return json([]);
    if (method === "POST" && /^\/api\/prep\/companies\/[^/]+\/progress$/.test(path)) return json({ ok: true });
    if (path.startsWith("/api/prep/")) return notHere("Prep plans for your own companies");
    if (method === "GET" && path === "/api/search") {
      const words = (query.get("q") || "").toLowerCase().split(/\s+/).filter(Boolean);
      const hits = PROBLEMS.filter((p) => words.every((w) => `${p.title} ${p.difficulty} ${PATTERNS[p.id] || ""}`.toLowerCase().includes(w)));
      return json(hits.map((p) => ({ id: p.id, title: p.title, difficulty: p.difficulty, pattern: PATTERNS[p.id] || "", where: "Built in" })));
    }
    if (method === "POST" && path === "/api/search/web") return notHere("Searching LeetCode on the web");
    if (method === "POST" && path === "/api/search/random") {
      const want = (body && body.difficulty) || "";
      const pool = PROBLEMS.filter((p) => !want || p.difficulty === want);
      if (!pool.length) return json({ detail: `No ${want} problems in this demo. The real app finds one on the web.` }, 404);
      const p = pick(pool);
      return json({ title: p.title, difficulty: p.difficulty, pattern: PATTERNS[p.id] || "", lib_id: p.id, have: true,
        leetcode_url: p.leetcode_url, why: "One of the demo's built-in problems. The real app picks one you haven't done from the web." });
    }
    if (method === "GET" && path === "/api/history") {
      return json(Object.values(store()).filter((d) => d.tries.length).map(summary).sort((a, b) => String(b.last_at).localeCompare(String(a.last_at))));
    }
    let m = /^\/api\/history\/([^/]+)$/.exec(path);
    if (m && method === "GET") {
      const doc = store()[decodeURIComponent(m[1])];
      return doc && doc.tries.length ? json({ ...doc, summary: summary(doc) }) : json({ detail: "Not in your history yet." }, 404);
    }
    m = /^\/api\/history\/([^/]+)\/tries\/(\d+)$/.exec(path);
    if (m && method === "DELETE") {
      const doc = store()[decodeURIComponent(m[1])];
      if (!doc) return json({ detail: "No such problem in your history." }, 404);
      doc.tries = doc.tries.filter((t) => t.n !== Number(m[2]));
      persist();
      return json({ ok: true });
    }
    return json({ detail: "Not part of this demo." }, 404);
  }
  window.fetch = async (input, init) => {
    const req = input instanceof Request ? input : null;
    const url = new URL(req ? req.url : String(input), location.href);
    const method = ((init && init.method) || (req && req.method) || "GET").toUpperCase();
    let body;
    try { body = init && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch { body = undefined; }
    await sleep(120);
    // Only the app's own routes exist here. Anything else is refused rather than fetched.
    if (url.origin !== location.origin || !url.pathname.includes("/api/")) return json({ detail: "Not part of this demo." }, 404);
    return route(method, url.pathname.slice(url.pathname.indexOf("/api/")), url.searchParams, body);
  };

  // ---------- the mic: the browser's own speech recognition ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  if (!SR && navigator.mediaDevices) {
    // No recognizer means nothing could hear you, so don't ask for the mic at all: the page offers typing.
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error("this browser has no built-in speech recognition, so the demo can't hear you"));
  }
  const MIC_ERRORS = {
    "not-allowed": "The browser didn't allow speech recognition here, so type your answers for now.",
    "service-not-allowed": "The browser didn't allow speech recognition here, so type your answers for now.",
    "network": "Your browser's speech service couldn't be reached, so type your answers for now.",
    "audio-capture": "No microphone was found, so type your answers for now.",
    "language-not-supported": "Your browser can't recognize this language, so type your answers for now.",
  };
  function listen() {
    const heard = { final: "", interim: "", error: "" };
    let ended = false, wake = null;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (e) => {
      let fin = "", mid = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript; else mid += r[0].transcript;
      }
      heard.final = fin; heard.interim = mid;
    };
    rec.onerror = (e) => { heard.error = e.error || "error"; };
    rec.onend = () => { ended = true; if (wake) wake(); };
    try { rec.start(); } catch { heard.error = "busy"; ended = true; }
    return {
      async stop() {
        if (!ended) {
          await new Promise((res) => { wake = res; try { rec.stop(); } catch { res(); } setTimeout(res, 2500); });
        }
        return { text: (heard.final + " " + heard.interim).replace(/\s+/g, " ").trim(), error: heard.error };
      },
      abort() { try { rec.abort(); } catch { /* already stopped */ } },
    };
  }

  // ---------- the interview: a scripted stand-in for Claude ----------
  class Cancelled extends Error {}
  class Server {
    constructor(sock) {
      this.sock = sock;
      this.session = null;
      this.turn = null;
      this.ear = null;
      this.paused = false;
    }
    send(obj) { this.sock.deliver(obj); }
    status(state) { this.send({ type: "status", state }); }
    notice(message) { this.send({ type: "notice", message }); }
    close() { this.cancel(false); if (this.ear) this.ear.abort(); }
    prestart() { if (SR && this.session && !this.paused && !this.ear) this.ear = listen(); }

    receive(m) {
      const ignoredWhilePaused = ["ptt_start", "ptt_end", "text", "debrief", "run", "review", "help", "interrupt"];
      if (this.paused && ignoredWhilePaused.includes(m.type)) return;
      const s = this.session;
      switch (m.type) {
        case "start": this.start(m); break;
        case "ptt_start":
          this.cancel(true);
          if (SR && !this.ear) this.ear = listen();
          this.status("listening");
          break;
        case "ptt_end": this.heardVoice(); break;
        case "text":
          this.cancel(true);
          if (s) this.reply(this.answer(String(m.text || ""), !!m.stuck));
          break;
        case "debrief":
          this.cancel(true);
          if (s) this.reply(this.debrief(), { debrief: true });
          break;
        case "board": if (s) s.board = { diagram: String(m.diagram || ""), notes: String(m.notes || "") }; break;
        case "code": if (s) s.code = String(m.code || ""); break;
        case "run": if (s) { s.code = String(m.code || ""); this.runTests(); } break;
        case "review": if (s) { s.code = String(m.code || ""); s.language = m.language || "python"; this.review(); } break;
        case "help": if (s) { if (m.code != null) s.code = String(m.code); this.help(String(m.kind || "ask"), String(m.question || "")); } break;
        case "interrupt": this.cancel(true); this.status("idle"); break;
        case "pause":
          if (!s || this.paused) return;
          this.cancel(true);
          if (this.ear) { this.ear.abort(); this.ear = null; }
          this.paused = true;
          s.pausedAt = Date.now();
          this.send({ type: "paused" });
          this.status("idle");
          break;
        case "resume":
          if (!this.paused) return;
          s.started += Date.now() - s.pausedAt;
          this.paused = false;
          this.send({ type: "resumed", elapsed_ms: Date.now() - s.started });
          break;
        case "abandon": {
          this.cancel(false);
          let removed = false;
          if (s && s.saved) {
            const doc = store()[s.key];
            if (doc) { doc.tries = doc.tries.filter((t) => t.n !== s.saved); persist(); removed = true; }
          }
          this.session = null;
          this.paused = false;
          this.send({ type: "abandoned", removed });
          break;
        }
      }
    }

    // ---- a session ----
    start(m) {
      this.cancel(false);
      this.paused = false;
      const id = String(m.problem || "");
      const persona = GREET[m.persona] ? m.persona : "neutral";
      let s;
      if (id.startsWith("behavioral:")) {
        const qs = S.behavioral.questions;
        const picked = (m.questions || []).map((q) => qs.find((x) => x.id === q)).filter(Boolean);
        s = { mode: "behavioral", problem: S.behavioral.problem, phases: S.phases.behavioral, minutes: S.minutes.behavioral,
          key: S.behavioral.history_key, questions: picked.length ? picked : qs.slice(0, 3), qi: 0 };
      } else if (DESIGNS[id]) {
        const d = DESIGNS[id];
        s = { mode: "design", problem: d.problem, phases: d.phases, minutes: S.minutes.design, key: d.history_key, design: d,
          board: { diagram: String(m.diagram || ""), notes: String(m.notes || "") }, boardSeen: "" };
      } else {
        if (id && !BY_ID[id]) this.notice("That problem isn't in this demo, so here's Two Sum.");
        const p = BY_ID[id] || PROBLEMS[0];
        s = { mode: "coding", problem: p, phases: S.phases.coding, minutes: S.minutes.coding, key: p.history_key, script: SCRIPTS[p.id], code: "" };
      }
      Object.assign(s, { persona, started: Date.now(), turns: 0, n: {}, saved: 0, state: { phase: s.phases[0], hint: 0, read: null, notes: "" } });
      this.session = s;
      const doc = store()[s.key];
      const past = doc && doc.tries.length ? summary(doc) : null;
      this.send({
        type: "session", problem: s.mode === "coding" ? publicCard(s.problem) : s.problem, mode: s.mode, phases: s.phases,
        persona, minutes: s.minutes, stt: true, tts: false, brain: "claude", state: { ...s.state },
        history: { key: s.key, tries: past ? past.tries : [], next: (past ? past.count : 0) + 1 },
      });
      // The app has just labelled these for the real server. Say what this page actually uses.
      const hint = $("voice-hint");
      if (hint) hint.textContent = "Browser voice";
      const engine = $("engine");
      if (engine) engine.textContent = "In this demo: a scripted interviewer, your browser's speech recognition (it may send audio to the browser maker's speech service) and your browser's voice. The real app runs Claude through Claude Code, Whisper and Piper, all on my PC.";
      this.reply(this.opening());
    }

    opening() {
      const s = this.session, hi = GREET[s.persona];
      if (s.mode === "behavioral") {
        s.state.notes = `Asking about ${s.questions[0].value.toLowerCase()}.`;
        return `${hi} This is a behavioral round of about thirty minutes, and I'll ask about a few experiences. First one: ${s.questions[0].question}`;
      }
      if (s.mode === "design") {
        s.state.notes = "Waiting for requirements questions.";
        return `${hi} Let's do a design round: ${s.problem.title}. ${s.problem.statement} Use the board for a diagram and notes. Start with requirements: what would you ask me?`;
      }
      s.state.notes = "Waiting for clarifying questions.";
      return `${hi} Here's the problem: ${s.problem.title}. ${s.problem.statement} You'll write it in Python. Before you start, any questions about the input?`;
    }

    answer(text, stuck) {
      const s = this.session;
      s.turns++;
      if (s.mode === "behavioral") return this.behavioral(text, stuck);
      if (s.mode === "design") return this.design(text, stuck);
      return this.coding(text, stuck);
    }

    hint(lead) {
      const s = this.session, st = s.state, i = Math.min(st.hint, 2);
      st.hint = Math.min(3, st.hint + 1);
      st.read = "stuck";
      st.notes = `Needed hint ${i + 1} during ${LABELS[st.phase] || st.phase}.`;
      return `${lead} ${s.problem.hints[i]}`;
    }

    coding(text, stuck) {
      const s = this.session, st = s.state, P = s.script, n = s.n, t = norm(text);
      const said = (k) => (n[k] = (n[k] || 0) + 1);
      if (stuck) {
        if (st.phase === "test") return "Try the smallest input you can think of and step through your code line by line.";
        if (st.phase === "complexity") return "Count how many times you touch each element, and what you keep in memory.";
        if (st.phase === "clarify") st.phase = "approach";
        return this.hint("No problem.");
      }
      const key = has(t, P.key), brute = has(t, P.brute);
      switch (st.phase) {
        case "clarify": {
          if (key || brute) { st.phase = "approach"; return this.coding(text, false); }
          const answers = P.faq.filter(([ks]) => has(t, ks)).map(([, a]) => a).slice(0, 2);
          if (answers.length) {
            st.read = "on_track";
            st.notes = "Asks good clarifying questions before diving in.";
            return answers.join(" ") + (said("clarify") >= 2 ? " When you're ready, talk me through an approach." : " Anything else?");
          }
          if (asksSomething(text) && said("clarify") < 3) return "Good question. Assume the simple case for now. Anything else, or shall we talk about an approach?";
          st.phase = "approach";
          return "Okay. Talk me through how you'd approach it.";
        }
        case "approach": {
          if (key) {
            st.phase = "code";
            st.read = "on_track";
            st.notes = `Found the efficient idea (${(PATTERNS[s.problem.id] || "").toLowerCase()}).`;
            return `That's the right direction. ${P.keyAck} Go ahead and write it in the code pad, and talk me through it as you go.`;
          }
          if (brute) {
            st.read = "on_track";
            st.notes = "Started from brute force, which is fine.";
            return said("brute") > 1 ? this.hint("Right.") : P.bruteAck;
          }
          if (said("approach") >= 2) return this.hint("Let me give you a nudge.");
          return `Say more about the steps. How would you find ${P.goal}?`;
        }
        case "code": {
          const wrote = s.code.trim() && s.code.trim() !== s.problem.starter.trim();
          const sees = wrote && P.code[0].test(s.code);
          const done = /\b(done|finished|thats it|that is it|it works|should work|complete|ready)\b/.test(t);
          if (done || (wrote && said("code") >= 3)) {
            st.phase = "test";
            st.notes = "Wrote a solution and is moving to testing.";
            return `${sees ? P.code[1] + " " : ""}Okay. Walk me through it on the example.`;
          }
          if (sees) return `${P.code[1]} Keep going, and tell me when you're done.`;
          return wrote ? "Sounds good. Keep talking as you write, and say done when you want me to look." : "Go ahead and write it in the code pad on the left. I can see it as you type.";
        }
        case "test": {
          if (said("test") === 1) { st.notes = "Tested on the example."; return `Good. ${P.edge}`; }
          st.phase = "complexity";
          return "Nice. What's the time and space complexity?";
        }
        case "complexity": {
          if (P.right(t)) {
            st.phase = "wrap";
            st.read = "done";
            st.notes = "Optimal solution, explained clearly.";
            return `Right, ${P.complexity}. That's a solid solution. Do you have any questions for me?`;
          }
          if (/\bo\b|big o|linear|squared|quadratic|log|constant/.test(t)) { st.read = "on_track"; return "Not quite. Count how many times you touch each element, and what you store."; }
          return "What would you say for time, and for space?";
        }
        default:
          return asksSomething(text) && said("wrap") === 1
            ? "Good question. New engineers here pair with a mentor for their first few months. That's all I had, so press Finish and debrief whenever you're ready."
            : "Thanks. That's all from my side. Press Finish and debrief for your feedback.";
      }
    }

    behavioral(text, stuck) {
      const s = this.session, st = s.state, t = norm(text), q = s.questions[s.qi];
      const words = t.trim().split(/\s+/).length;
      const result = /result|in the end|ended up|turned out|shipped|launched|percent|%|reduced|increased|dropped|fell|cut|fewer|less|faster|saved|grew|improved|doubled|halved|\d| (zero|one|two|three|four|five|six|seven|eight|nine|ten|twenty|fifty|hundred|thousand|half|twice) /.test(t);
      const next = (p, line, note) => { st.phase = p; st.read = "on_track"; if (note) st.notes = note; return line; };
      if (stuck) { st.read = "stuck"; return "Take your time. A project from school, an internship or something you built on your own all work. Even a small one is fine."; }
      if (["question", "situation"].includes(st.phase) && words > 80 && result) {
        return next("follow_up", "That's a complete story, thanks. If you did it again, what would you change?", "Told a full STAR story in one go.");
      }
      switch (st.phase) {
        case "question": return next("situation", "Thanks. Set the scene for me: what was going on, and what was at stake?", `Started a story about ${q.value.toLowerCase()}.`);
        case "situation": return next("task", "What was your part in it? What were you responsible for?", "Situation is clear.");
        case "task": return next("action", "Walk me through what you did, step by step.", "Task is clear.");
        case "action":
          if (count(t, / we /g) > count(t, / i /g) && !s.n.we) {
            s.n.we = 1;
            st.notes = "Says we more than I. Probing for their own part.";
            return "You said we a few times. What did you do yourself?";
          }
          return next("result", "And how did it turn out? Any numbers you can share?", "Actions are specific.");
        case "result":
          if (!result && !s.n.number) { s.n.number = 1; return "Can you put a number on it, or say what changed afterwards?"; }
          return next("follow_up", "If you did it again, what would you change?", "Has a result.");
        case "follow_up":
          s.qi++;
          if (s.qi < s.questions.length) {
            return next("question", `Thanks, that's helpful. Next one: ${s.questions[s.qi].question}`, `Asking about ${s.questions[s.qi].value.toLowerCase()}.`);
          }
          return next("wrap", "Thanks, those are all my questions. Do you have any for me?", "Covered every question.");
        default:
          return asksSomething(text) && !s.n.asked++
            ? "Good question. The team does a short retro after every launch, and people really do change things because of them. Press Finish and debrief whenever you're ready."
            : "Thanks for your time. Press Finish and debrief for your feedback.";
      }
    }

    design(text, stuck) {
      const s = this.session, st = s.state, d = s.design;
      const i = s.phases.indexOf(st.phase);
      const diagram = (s.board && s.board.diagram || "").trim();
      let seen = "";
      if (diagram && diagram !== s.boardSeen) {
        const links = count(diagram, /-->|---|<\|--|\*--|o--|\.\.>|-\.->|==>/g);
        seen = links ? `Thanks, I can see the diagram on the board with ${links} connection${links > 1 ? "s" : ""}. ` : "Thanks, I can see the diagram on the board. ";
        s.boardSeen = diagram;
      }
      if (stuck) { st.read = "stuck"; return `${seen}Start with ${d.problem.focus[0]}. What are the pieces involved?`; }
      if (st.phase === "requirements" && asksSomething(text) && !s.n.req) {
        s.n.req = 1;
        st.read = "on_track";
        st.notes = "Asked about scope first.";
        return `${seen}Good question. ${REQUIREMENTS[d.id] || "Assume a mid-sized system and keep it simple to start."} Anything else?`;
      }
      if (st.phase === "wrap") return `${seen}${DESIGN_ASK.wrap(d)}`;
      const nextPhase = s.phases[Math.min(i + 1, s.phases.length - 1)];
      st.notes = `Covered ${st.phase.replace(/_/g, " ")}.`;
      st.read = "on_track";
      st.phase = nextPhase;
      return `${seen}${pick(["Okay.", "Makes sense.", "Good."])} ${(DESIGN_ASK[nextPhase] || DESIGN_ASK.wrap)(d)}`;
    }

    debrief() {
      const s = this.session, st = s.state, i = s.phases.indexOf(st.phase);
      const join = (xs) => xs.length > 1 ? xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1] : xs[0];
      let text;
      if (s.mode === "coding") {
        const good = [], fix = [];
        if (s.n.clarify) good.push("you asked clarifying questions before coding");
        if (i >= s.phases.indexOf("code")) good.push("you found a working approach");
        if (st.read === "done") good.push("you explained the complexity correctly");
        if (st.hint) fix.push(`you needed ${st.hint} hint${st.hint > 1 ? "s" : ""}, so drill this pattern until you reach the idea alone`);
        if (i < s.phases.indexOf("test")) fix.push("leave time to test your code on an edge case");
        if (st.read !== "done") fix.push("state the time and space cost without being asked");
        const verdict = st.read === "done" && st.hint <= 1 ? "this would likely pass" : i >= s.phases.indexOf("code") ? "this is close, but not a pass yet" : "this wouldn't pass yet";
        text = `Here's my debrief: ${verdict}. ${good.length ? "What went well: " + join(good) + "." : "You got started, which is the hardest part."} ${fix.length ? "To work on: " + join(fix) + "." : "Keep doing exactly this."}`;
      } else if (s.mode === "behavioral") {
        const done = st.phase === "question" ? s.qi : Math.min(s.qi + 1, s.questions.length);
        const told = done ? `You answered ${done} question${done > 1 ? "s" : ""}${st.phase === "wrap" ? ", all of them," : ""} in STAR form.` : "We didn't get through a full story yet, so aim for one complete answer next time.";
        text = `Here's my debrief. ${told} ${s.n.we ? "In one story you said we for the key decisions, so make your own part plainer." : "Your own part in each story was clear."} ${s.n.number ? "Put a number on every result before the interview." : "Keep ending on a concrete result."}`;
      } else {
        const covered = Math.max(1, i);
        text = `Here's my debrief. You covered ${covered} of ${s.phases.length - 1} stages${s.boardSeen ? " and used the board well" : ""}. ${s.boardSeen ? "" : "Next time, draw on the board early: it keeps both of us on the same picture. "}${i < s.phases.length - 1 ? "Watch the clock so you reach the later stages, where the trade-offs are." : "You reached the trade-offs, which is where design rounds are won."}`;
      }
      st.phase = "wrap";
      if (!st.read || st.read === "stuck") st.read = st.read || "on_track";
      return text.replace(/\s+/g, " ").trim();
    }

    // ---- speaking a reply, sentence by sentence, the way the server streams it ----
    cancel(notify) {
      const turn = this.turn;
      this.turn = null;
      if (turn && !turn.done) { turn.cancelled = true; if (notify) this.send({ type: "interrupted" }); }
    }
    async reply(text, opts = {}) {
      const turn = { cancelled: false, done: false };
      this.turn = turn;
      const wait = async (ms) => { await sleep(ms); if (turn.cancelled) throw new Cancelled(); };
      try {
        this.status("thinking");
        await wait(500 + Math.random() * 400);
        const parts = sentences(text);
        for (let i = 0; i < parts.length; i++) {
          this.send({ type: "say", text: parts[i] });
          if (i === 0) this.status("speaking");
          await wait(180);
        }
        if (opts.debrief) this.saveTry({ debrief: text });
        turn.done = true;
        const s = this.session;
        this.send({ type: "turn_end", text, state: { ...s.state },
          timings: { stt_ms: null, first_token_ms: null, first_audio_ms: null, total_ms: null } });
        this.status("idle");
      } catch (e) {
        if (!(e instanceof Cancelled)) throw e;
      } finally {
        if (this.turn === turn) this.turn = null;
      }
    }
    async heardVoice() {
      const ear = this.ear;
      this.ear = null;
      if (!ear) { this.notice("Speech recognition isn't available in this browser, so type your answer instead."); this.status("idle"); return; }
      this.status("transcribing");
      const { text, error } = await ear.stop();
      if (!this.session || this.paused) return;
      if (!text) {
        this.notice(MIC_ERRORS[error] || "I didn't catch that. Try again a little closer to the mic.");
        this.status("idle");
        return;
      }
      this.send({ type: "transcript", text });
      this.reply(this.answer(text, false));
    }

    // ---- the code pad's side tasks ----
    async runTests() {
      const s = this.session;
      await sleep(700);
      if (s !== this.session) return;
      if (s.mode !== "coding") { this.send({ type: "pad_error", action: "run", message: "Run works in coding rounds." }); return; }
      const res = hasReturn(s.code) ? s.problem.runs.solved : s.problem.runs.starter;
      if (hasReturn(s.code)) this.notice("Nothing runs in this demo, so Run tests shows a recorded run of a working solution, not of your code.");
      s.lastRun = res;
      this.send({ type: "run_result", result: res });
    }
    async review() {
      const s = this.session;
      await sleep(1400);
      if (s !== this.session) return;
      if (s.mode !== "coding") { this.send({ type: "pad_error", action: "review", message: "Review works in coding rounds." }); return; }
      const lang = s.language || "python";
      const written = lang === "python" ? hasReturn(s.code) : s.code.trim().length > 40;
      const tests = lang === "python" ? (s.lastRun ? { passed: s.lastRun.passed, total: s.lastRun.total } : null) : null;
      let rv;
      if (!written) {
        rv = { verdict: "No hire", language: lang, tests, summary: "There's no working solution in the pad yet, so there's nothing to judge.",
          scores: { correctness: 0, efficiency: 0, code_quality: 1, edge_cases: 0 }, correctness: "The function doesn't return anything yet.",
          time_complexity: "n/a", space_complexity: "n/a", optimal: false, better_approach: s.script.keyAck,
          bugs: [], edge_cases_missed: [], readability: [], next_steps: ["Talk through the approach first, then write it."] };
      } else {
        this.notice("Nothing runs in this demo, so this is a recorded review of a working solution, not of your code.");
        rv = { verdict: "Hire", language: lang, tests, optimal: true, better_approach: "", bugs: [], edge_cases_missed: [],
          scores: { correctness: 4, efficiency: 4, code_quality: 3, edge_cases: 3 }, ...REVIEWS[s.problem.id] };
      }
      this.send({ type: "review_result", review: rv });
      this.saveTry({ review: rv, code: s.code, language: lang, run: tests ? { ...tests, compiled: true, timed_out: false } : undefined });
    }
    async help(kind, question) {
      const s = this.session;
      await sleep(800);
      if (s !== this.session) return;
      if (s.mode !== "coding") { this.send({ type: "pad_error", action: "help", message: "Help works in coding rounds." }); return; }
      const CONCEPT = {
        "two-sum": "A hash map stores keys with values and finds a key in constant time on average, so a lookup inside a loop doesn't add another loop.",
        "valid-parens": "A stack is last in, first out: the most recent opening bracket is the one the next closing bracket has to match.",
        "longest-substring": "A sliding window keeps a range with a left and a right edge, and moves the left edge forward only when the range breaks the rule.",
        "merge-intervals": "Sorting intervals by their start puts every interval that could overlap right next to each other.",
      };
      const syntax = /syntax|how do i (write|declare|make)|python|dict|append|enumerate|sort\(|lambda/.test(norm(question));
      let entry;
      if (kind === "search") {
        entry = { kind, question, counted: false, category: "concept_general", links: [],
          answer: "Web look-ups need the real app. It searches the web for the concept and leaves out pages that solve this exact problem." };
      } else if (kind === "concept") {
        entry = { kind, question: question || "Explain the concept", counted: false, category: "concept_general", answer: CONCEPT[s.problem.id] };
      } else if (kind === "failing") {
        entry = { kind, question: question || "Why is a test failing?", counted: false, category: "concept_general",
          answer: "Nothing runs in this demo, so there's no failing case to read. In the real app this looks at your last run and points at the line." };
      } else if (kind === "ask" && syntax) {
        entry = { kind, question, counted: false, category: "syntax",
          answer: "In Python, a dict is written with curly braces, and enumerate gives you the index and the value together. That's syntax, so it doesn't count as a hint." };
      } else {
        const i = Math.min(s.state.hint, 2);
        const lead = { nudge: "", approach: "If it's correct on the example, check the cost next. " }[kind] || "";
        entry = { kind, question: question || ({ nudge: "Nudge me", approach: "Is my approach right?" }[kind] || "Help"), counted: true, category: "approach",
          answer: lead + s.problem.hints[i] };
        s.state.hint = Math.min(3, s.state.hint + 1);
      }
      entry.at = new Date().toTimeString().slice(0, 5);
      this.send({ type: "help_result", entry, state: { ...s.state } });
    }

    // Save this session as a try (or update it), the way the server does after a review or a debrief.
    saveTry(extra) {
      const s = this.session;
      if (!s) return;
      const all = store();
      const p = s.problem;
      const doc = all[s.key] || (all[s.key] = docFor(s.key, s.mode, s.mode === "behavioral" ? S.behavioral.title : p.title, {
        difficulty: s.mode === "coding" ? p.difficulty : "", pattern: PATTERNS[p.id] || "", leetcode_url: p.leetcode_url || "", problem_id: p.id }));
      let t = s.saved && doc.tries.find((x) => x.n === s.saved);
      if (!t) {
        t = { n: doc.tries.reduce((m, x) => Math.max(m, x.n), 0) + 1, at: new Date().toISOString(), mode: s.mode };
        doc.tries.push(t);
        s.saved = t.n;
      }
      Object.assign(t, { read: s.state.read, hints: s.mode === "coding" ? s.state.hint : null, turns: s.turns,
        minutes: Math.max(1, Math.round((Date.now() - s.started) / 60000)), persona: s.persona }, extra);
      if (s.mode === "coding" && !t.code && s.code.trim()) Object.assign(t, { code: s.code, language: "python" });
      if (s.mode === "design") Object.assign(t, { diagram: s.board.diagram, board_notes: s.board.notes });
      persist();
      this.send({ type: "attempt_saved", key: s.key, n: t.n });
    }
  }

  // The page's WebSocket to /ws, answered by the scripted server above.
  class DemoSocket extends EventTarget {
    constructor(url) {
      super();
      this.url = String(url);
      this.readyState = 0;
      this.binaryType = "blob";
      this.onopen = this.onmessage = this.onclose = this.onerror = null;
      this.server = new Server(this);
      setTimeout(() => { if (this.readyState !== 0) return; this.readyState = 1; this.fire(new Event("open")); }, 60);
    }
    send(data) {
      if (this.readyState !== 1) throw new DOMException("The connection isn't open.", "InvalidStateError");
      if (typeof data !== "string") return; // microphone audio: the browser's recognizer hears it instead
      let m;
      try { m = JSON.parse(data); } catch { return; }
      // Start listening while the key press still counts as the user's own action: some browsers
      // only allow speech recognition to start from one. The rest of ptt_start runs a moment later.
      if (m.type === "ptt_start") this.server.prestart();
      setTimeout(() => this.server.receive(m), 0);
    }
    deliver(obj) {
      if (this.readyState !== 1) return;
      this.fire(new MessageEvent("message", { data: JSON.stringify(obj) }));
    }
    close() {
      if (this.readyState === 3) return;
      this.readyState = 3;
      this.server.close();
      this.fire(new CloseEvent("close", { code: 1000 }));
    }
    fire(ev) { const h = this["on" + ev.type]; if (h) h.call(this, ev); this.dispatchEvent(ev); }
  }
  DemoSocket.CONNECTING = 0; DemoSocket.OPEN = 1; DemoSocket.CLOSING = 2; DemoSocket.CLOSED = 3;
  window.WebSocket = DemoSocket;

  // ---------- what the page says about itself ----------
  function banner() {
    document.body.classList.add("demo");
    const el = document.createElement("aside");
    el.className = "demo-banner";
    el.setAttribute("aria-label", "About this demo");
    const tag = document.createElement("strong");
    tag.textContent = "Demo";
    const text = document.createElement("span");
    text.textContent = "Made-up data and a scripted interviewer, so nothing here runs on a server. The real Voice Tutor runs on my PC, with Whisper listening, Claude interviewing and Piper speaking. Here the mic uses your browser's own speech recognition, or you can type.";
    const hide = document.createElement("button");
    hide.type = "button";
    hide.textContent = "Hide";
    hide.addEventListener("click", () => el.remove());
    el.append(tag, text, hide);
    document.body.prepend(el);
    const hint = $("voice-hint");
    if (hint) hint.textContent = SR ? "Hold Space or the button to talk, or type your answers." : "This browser can't recognize speech, so type your answers (or try Chrome, Edge or Safari).";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", banner); else banner();
})();
