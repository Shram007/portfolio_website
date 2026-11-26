(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);

  const PHASE_LABELS = {
    clarify: "Clarify", approach: "Approach", code: "Code", test: "Test", complexity: "Complexity", wrap: "Wrap-up",
    question: "Question", situation: "Situation", task: "Task", action: "Action", result: "Result", follow_up: "Follow-up",
    requirements: "Requirements", use_cases: "Use cases", classes: "Classes", extend: "Extend", estimates: "Estimates",
    api: "API & data", high_level: "High-level", deep_dive: "Deep dive", tradeoffs: "Trade-offs",
    interfaces: "Interfaces", implement: "Implement", failures: "Failures",
  };
  const CODING_PHASES = ["clarify", "approach", "code", "test", "complexity", "wrap"];
  let phases = CODING_PHASES;
  const READ_LABELS = { on_track: "On track", stuck: "Stuck", wrong_direction: "Off course", done: "Done" };
  const STATUS_TEXT = {
    idle: "Your turn. Hold Space or the button while you talk.",
    listening: "Listening. Release when you're done.",
    transcribing: "Turning your words into text…",
    thinking: "Interviewer is thinking…",
    speaking: "Interviewer is speaking. Hold Space to cut in.",
  };

  let problems = [];
  let designList = [];
  let ws = null;
  let session = null;        // last "session" message
  let wantConnected = false;
  let audioCtx = null;
  let micNode = null;
  let micReady = false;
  let recording = false;
  let pendingEnd = false;    // waiting for the worklet's final chunk before sending ptt_end
  let serverStatus = "idle";
  let turnDone = true;
  let playTime = 0;
  let sources = [];
  let bubble = null;         // interviewer bubble being filled this turn
  let clockStart = 0;
  const timingHistory = { stt: [], first_token: [], first_audio: [], total: [] };
  let awaitingDebrief = false;
  let turns = 0;
  let paused = false;        // the clock and the interviewer are stopped
  let ended = false;         // "End, don't save": back at the start gate until Start interview

  // Launched from a prep plan task: /?prep=<company>&task=<key>&problem=<id>&questions=a,b&label=...
  const params = new URLSearchParams(location.search);
  const prepTask = params.get("prep") && params.get("task") ? {
    cid: params.get("prep"), key: params.get("task"), problem: params.get("problem") || "",
    questions: (params.get("questions") || "").split(",").filter(Boolean), label: params.get("label") || "",
  } : null;
  // Opened from the History page: /?problem=<id>&redo=<history key>&fresh=1 (blank starter) or &from_try=<n>.
  const redo = params.get("redo") ? {
    key: params.get("redo"), problem: params.get("problem") || "", fromTry: Number(params.get("from_try")) || 0,
    fresh: params.get("fresh") === "1", label: params.get("label") || "",
  } : null;
  let currentTry = null; // {key, n} once this session's try is saved

  // ---------- Problem + flow rendering ----------
  // The short version above the tabs: title, kind and the first lines of the statement.
  function renderStrip(p) {
    const el = $("probstrip");
    el.replaceChildren();
    if (!p) return;
    const h = document.createElement("h2");
    h.textContent = p.title;
    const d = document.createElement("span");
    d.className = "diff " + p.difficulty.toLowerCase();
    d.textContent = p.difficulty;
    h.append(d);
    const st = document.createElement("p");
    st.textContent = p.statement;
    st.title = p.statement;
    const more = document.createElement("button");
    more.type = "button";
    more.className = "more";
    more.textContent = "Full problem";
    more.addEventListener("click", () => showTab("pane-problem"));
    el.append(h, st, more);
  }

  function renderProblem(p) {
    const el = $("problem");
    el.replaceChildren();
    renderStrip(p);
    if (!p) return;
    const h = document.createElement("h2");
    h.textContent = p.title;
    const d = document.createElement("span");
    d.className = "diff " + p.difficulty.toLowerCase();
    d.textContent = p.difficulty;
    h.append(d);
    const st = document.createElement("p");
    st.textContent = p.statement;
    if (p.questions) {
      const ol = document.createElement("ol");
      ol.className = "qlist";
      for (const q of p.questions) {
        const li = document.createElement("li");
        const v = document.createElement("b");
        v.textContent = q.value + ": ";
        li.append(v, q.question);
        ol.append(li);
      }
      el.append(h, st, ol);
      return;
    }
    if (p.focus) {
      const ul = document.createElement("ul");
      ul.className = "qlist";
      for (const f of p.focus) { const li = document.createElement("li"); li.textContent = f; ul.append(li); }
      const lead = document.createElement("p");
      lead.className = "hint-text";
      lead.textContent = "A strong answer covers:";
      el.append(h, st, ...(p.focus.length ? [lead, ul] : []));
      return;
    }
    const ex = document.createElement("pre");
    ex.textContent = p.example;
    const sig = document.createElement("p");
    sig.className = "hint-text";
    sig.append("You'll write it in Python as ");
    const c = document.createElement("code");
    c.textContent = p.fn + "(...)";
    sig.append(c, ".");
    el.append(h, st, ex, sig);
  }

  function renderFlow(state) {
    const idx = phases.indexOf(state.phase);
    $("phases").replaceChildren(...phases.map((key, i) => {
      const li = document.createElement("li");
      li.textContent = PHASE_LABELS[key] || key;
      if (i < idx) li.className = "done";
      if (i === idx) { li.className = "now"; li.setAttribute("aria-current", "step"); }
      return li;
    }));
    [...$("ladder").children].forEach((s, i) => s.classList.toggle("on", i < state.hint));
    const a = $("assess");
    a.className = "chip " + (state.read || "");
    a.textContent = READ_LABELS[state.read] || "Not yet";
    $("flow-badge").textContent = idx >= 0 ? PHASE_LABELS[state.phase] || state.phase : "";
    $("notes-text").textContent = state.notes || "Waiting for your first answer.";
  }

  // ---------- Transcript ----------
  function addMsg(role, text) {
    const wrap = document.createElement("div");
    wrap.className = "msg " + role;
    if (role !== "sys") {
      const who = document.createElement("span");
      who.className = "who";
      who.textContent = role === "you" ? "You" : "Interviewer";
      wrap.append(who);
    }
    const t = document.createElement("div");
    t.className = "text";
    t.textContent = text;
    wrap.append(t);
    $("transcript").append(wrap);
    scrollDown();
    if ($("pane-conv").hidden && role !== "sys") $("tab-conv").classList.add("new");
    return t;
  }
  function scrollDown() { const tr = $("transcript"); tr.scrollTop = tr.scrollHeight; }

  // ---------- Status ----------
  function setDot(kind, text) { $("status-dot").className = "dot " + kind; $("status-text").textContent = text; }

  function setTalkUi(state) {
    serverStatus = state;
    const btn = $("btn-talk");
    btn.classList.toggle("listening", state === "listening");
    btn.classList.toggle("busy", state === "transcribing" || state === "thinking");
    $("talk-label").textContent = state === "listening" ? "Listening… release to send" : (state === "speaking" ? "Hold to cut in" : "Hold to talk");
    $("talk-state").textContent = STATUS_TEXT[state] || "";
    setDot(state === "idle" ? "ok" : "wait", STATUS_TEXT[state] || "");
  }

  function maybeIdle() {
    if (turnDone && !sources.length && !recording && (serverStatus === "speaking" || serverStatus === "thinking")) setTalkUi("idle");
  }

  // ---------- Audio out ----------
  function playPcm(buf) {
    if (!audioCtx) return;
    const rate = new DataView(buf).getUint32(0, true);
    const pcm = new Int16Array(buf, 4);
    if (!pcm.length) return;
    const ab = audioCtx.createBuffer(1, pcm.length, rate);
    const ch = ab.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;
    const src = audioCtx.createBufferSource();
    src.buffer = ab;
    src.connect(audioCtx.destination);
    const at = Math.max(audioCtx.currentTime + 0.03, playTime);
    src.start(at);
    playTime = at + ab.duration;
    sources.push(src);
    src.onended = () => { sources = sources.filter((s) => s !== src); maybeIdle(); };
  }

  function browserSpeak(text) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.onend = () => maybeIdle();
      speechSynthesis.speak(u);
    } catch { /* no browser voice either: text only */ }
  }

  function stopPlayback() {
    for (const s of sources) { try { s.stop(); } catch {} }
    sources = [];
    playTime = 0;
    try { speechSynthesis.cancel(); } catch {}
  }

  // ---------- Mic ----------
  async function setupAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      await audioCtx.audioWorklet.addModule("./mic-worklet.js");
      const srcNode = audioCtx.createMediaStreamSource(stream);
      micNode = new AudioWorkletNode(audioCtx, "mic-capture");
      const mute = audioCtx.createGain();
      mute.gain.value = 0;
      srcNode.connect(micNode).connect(mute).connect(audioCtx.destination);
      micNode.port.onmessage = onMicMessage;
      micReady = true;
    } catch (err) {
      micReady = false;
      addMsg("sys", "Microphone unavailable (" + (err && err.message || err) + "). You can still type your answers.");
    }
  }

  const levelBars = () => [...$("level").children];
  function onMicMessage(e) {
    const d = e.data;
    if (d.pcm) {
      if (ws && ws.readyState === 1) ws.send(d.pcm);
    } else if (d.done) {
      if (pendingEnd && ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "ptt_end" }));
      pendingEnd = false;
    } else if (typeof d.level === "number") {
      const lvl = recording ? Math.min(1, d.level * 3) : 0;
      levelBars().forEach((b, i) => { b.style.height = (4 + lvl * 14 * (0.6 + 0.4 * Math.sin(i * 1.7 + performance.now() / 90))) + "px"; });
    }
  }

  function canTalk() { return micReady && session && session.stt && !paused && ws && ws.readyState === 1; }

  function pttStart() {
    if (recording || pendingEnd || !canTalk()) return;
    stopPlayback();
    if (bubble && !turnDone) markCut();
    recording = true;
    ws.send(JSON.stringify({ type: "ptt_start" }));
    micNode.port.postMessage({ on: true });
    setTalkUi("listening");
  }

  function pttEnd() {
    if (!recording) return;
    recording = false;
    pendingEnd = true;
    micNode.port.postMessage({ on: false });
    setTalkUi("transcribing");
  }

  function markCut() {
    if (!bubble) return;
    const cut = document.createElement("span");
    cut.className = "cut";
    cut.textContent = " (cut off)";
    bubble.append(cut);
    bubble = null;
    turnDone = true;
  }

  // ---------- Socket ----------
  function connect() {
    ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws");
    ws.binaryType = "arraybuffer";
    ws.onopen = () => { if (!ended) startInterview(); };
    ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) { playPcm(e.data); return; }
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      handle(m);
    };
    ws.onclose = () => {
      $("btn-talk").disabled = true;
      setDot("bad", "Lost connection to the local server. Retrying…");
      if (wantConnected) setTimeout(connect, 2000);
    };
  }

  function startInterview() {
    stopPlayback();
    bubble = null;
    turnDone = true;
    awaitingDebrief = false;
    turns = 0;
    const start = { type: "start", problem: $("sel-problem").value, persona: $("sel-persona").value };
    if (prepTask && start.problem === prepTask.problem && prepTask.questions.length) start.questions = prepTask.questions;
    if (prepTask && start.problem === prepTask.problem) start.plan = { cid: prepTask.cid, task: prepTask.key };
    currentTry = null;
    if (start.problem.startsWith("design:")) { start.diagram = $("board-src").value; start.notes = $("board-notes").value; }
    ws.send(JSON.stringify(start));
  }

  // "Try 3 · before: No hire → Hire" for this session's problem.
  function showTry(hist, saved) {
    const bar = $("trybar");
    if (!hist) { bar.hidden = true; return; }
    bar.hidden = false;
    const n = saved ? hist.n : hist.next;
    $("try-n").textContent = `Try ${n}` + (saved ? " · saved" : "");
    $("try-n").classList.toggle("saved", !!saved);
    if (!saved) {
      const past = (hist.tries || []).slice(-4).map((t) => t.verdict || (t.tests && t.tests.total ? `${t.tests.passed}/${t.tests.total} tests` : t.read ? READ_LABELS[t.read] || t.read : "practised"));
      $("try-past").textContent = past.length ? "Before: " + past.join(" → ") : "First try at this problem";
    }
    $("try-link").href = "./history.html#" + encodeURIComponent(hist.key);
  }

  function handle(m) {
    if (m.type === "paused") { setPaused(true); return; }
    if (m.type === "resumed") { if (m.elapsed_ms != null) clockStart = Date.now() - m.elapsed_ms; setPaused(false); return; }
    if (m.type === "abandoned") { endedUi(m.removed); return; }
    if (m.type === "attempt_saved") { currentTry = { key: m.key, n: m.n }; showTry(currentTry, true); return; }
    if (Help.handle(m)) return;
    if (CodePad.handle(m)) return;
    switch (m.type) {
      case "session": {
        session = m;
        ended = false;
        setPaused(false);
        phases = m.phases || CODING_PHASES;
        $("hint-meter").hidden = m.mode !== "coding";
        showBoard(m.mode === "design");
        CodePad.show(m.problem, m.mode === "coding");
        Help.show(m.mode === "coding", m.problem && m.problem.id);
        if (m.mode === "coding") applyPendingCode();
        showTry(m.history, false);
        clockStart = Date.now();
        $("transcript").replaceChildren();
        renderProblem(m.problem);
        renderFlow(m.state);
        $("btn-talk").disabled = !canTalk();
        $("btn-restart").disabled = false;
        $("btn-finish").disabled = false;
        $("btn-pause").disabled = false;
        $("btn-end").disabled = false;
        $("voice-hint").textContent = m.tts ? "Local voice" : "Browser voice (Piper not loaded)";
        $("engine").textContent = "Brain: " + (m.brain === "ollama" ? "Ollama (offline)" : "Claude via Claude Code") +
          " · Speech-to-text: " + (m.stt ? "Whisper, local" : "off") + " · Voice: " + (m.tts ? "Piper, local" : "browser");
        if (!m.stt) addMsg("sys", "Speech-to-text didn't load on the server, so type your answers for now.");
        break;
      }
      case "status":
        if (m.state === "speaking" || m.state === "thinking" || m.state === "transcribing" || m.state === "listening") setTalkUi(m.state);
        else if (m.state === "idle") { turnDone = true; if (!sources.length && !recording) setTalkUi("idle"); }
        break;
      case "transcript":
        addMsg("you", m.text);
        turns++;
        break;
      case "say":
        if (!bubble) { turnDone = false; bubble = addMsg("interviewer", m.text); }
        else { bubble.textContent += " " + m.text; scrollDown(); }
        if (session && !session.tts) browserSpeak(m.text);
        break;
      case "turn_end":
        if (!bubble && m.text) bubble = addMsg("interviewer", m.text);
        if (awaitingDebrief) { awaitingDebrief = false; saveResult(m); }
        bubble = null;
        turnDone = true;
        renderFlow(m.state);
        showTimings(m.timings);
        maybeIdle();
        break;
      case "interrupted":
        markCut();
        break;
      case "notice":
        addMsg("sys", m.message);
        break;
      case "error":
        addMsg("sys", m.message);
        setDot("bad", m.message);
        break;
    }
  }

  // ---------- Timings ----------
  function fmtMs(v) { return v == null ? "–" : (v / 1000).toFixed(2) + "s"; }
  function showTimings(t) {
    if (!t) return;
    const map = { stt: t.stt_ms, first_token: t.first_token_ms, first_audio: t.first_audio_ms, total: t.total_ms };
    for (const [k, v] of Object.entries(map)) {
      $("t-" + k).textContent = fmtMs(v);
      if (v != null) timingHistory[k].push(v);
      const h = timingHistory[k];
      $("a-" + k).textContent = h.length ? fmtMs(h.reduce((a, b) => a + b, 0) / h.length) : "–";
    }
    $("lat-mini").textContent = t.total_ms != null ? "reply " + fmtMs(t.total_ms) + (t.stt_ms != null ? " · stt " + fmtMs(t.stt_ms) : "") : "";
  }

  // ---------- Clock ----------
  setInterval(() => {
    if (!session || paused) return;
    const left = Math.max(0, session.minutes * 60000 - (Date.now() - clockStart));
    const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
    $("clock-val").textContent = String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
    $("clock").classList.toggle("low", left < 10 * 60000);
  }, 1000);

  // ---------- Input wiring ----------
  const talk = $("btn-talk");
  talk.addEventListener("pointerdown", (e) => { e.preventDefault(); talk.setPointerCapture(e.pointerId); pttStart(); });
  talk.addEventListener("pointerup", pttEnd);
  talk.addEventListener("pointercancel", pttEnd);
  talk.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") e.preventDefault(); });

  function typingTarget(el) { return el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.tagName === "SELECT"); }
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.repeat || paused || typingTarget(document.activeElement)) return;
    e.preventDefault();
    pttStart();
  });
  document.addEventListener("keyup", (e) => {
    if (e.code !== "Space" || paused || typingTarget(document.activeElement)) return;
    e.preventDefault();
    pttEnd();
  });
  window.addEventListener("blur", pttEnd);

  function sendTyped(text, stuck) {
    if (!ws || ws.readyState !== 1 || !session || paused) return;
    if (!stuck && !text.trim()) return;
    stopPlayback();
    if (bubble && !turnDone) markCut();
    addMsg("you", stuck ? "I'm stuck." : text.trim());
    turns++;
    ws.send(JSON.stringify({ type: "text", text, stuck: !!stuck }));
    $("say").value = "";
  }
  $("btn-send").addEventListener("click", () => sendTyped($("say").value, false));
  $("btn-stuck").addEventListener("click", () => sendTyped("", true));
  $("say").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTyped($("say").value, false); }
  });

  $("btn-begin").addEventListener("click", async () => {
    $("btn-begin").disabled = true;
    if (ws && ws.readyState === 1) {
      // Starting again after "End, don't save": audio and the connection are already up.
      ended = false;
      $("gate").hidden = true;
      $("live").hidden = false;
      startInterview();
      return;
    }
    setDot("wait", "Setting up audio…");
    await setupAudio();
    $("gate").hidden = true;
    $("live").hidden = false;
    wantConnected = true;
    connect();
  });

  // ---------- Finish, debrief and save back to the plan ----------
  function finish() {
    if (!ws || ws.readyState !== 1 || !session || paused) return;
    stopPlayback();
    if (bubble && !turnDone) markCut();
    awaitingDebrief = true;
    $("btn-finish").disabled = true;
    addMsg("sys", "Interview finished. Debrief coming up…");
    ws.send(JSON.stringify({ type: "debrief" }));
  }
  $("btn-finish").addEventListener("click", finish);

  async function saveResult(m) {
    if (!prepTask) return;
    const result = {
      mode: session.mode, title: session.problem.title, read: m.state.read, phase: m.state.phase,
      hints: m.state.hint, debrief: m.text, turns,
      minutes: Math.round((Date.now() - clockStart) / 60000), persona: $("sel-persona").value,
    };
    if (session.mode === "design") {
      result.diagram = $("board-src").value.slice(0, 8000);
      result.board_notes = $("board-notes").value.slice(0, 8000);
    }
    if (session.mode === "coding") Object.assign(result, CodePad.result() || {});
    if (currentTry) result.history = currentTry;
    const post = (body) => fetch(`/api/prep/companies/${encodeURIComponent(prepTask.cid)}/progress`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).then((r) => { if (!r.ok) throw new Error("save failed"); });
    try {
      await post({ kind: "result", key: prepTask.key, value: result });
      await post({ kind: "done", key: prepTask.key, value: true });
      $("task-saved").textContent = "Saved to your plan and ticked off";
    } catch {
      $("task-saved").textContent = "Couldn't save to the plan";
    }
  }

  function restart() { if (ws && ws.readyState === 1 && !ended) startInterview(); }

  // ---------- Pause and "End, don't save" ----------
  const live = () => !!(ws && ws.readyState === 1 && session && !ended);
  function setPaused(on) {
    const was = paused;
    paused = on;
    $("veil").hidden = !on;
    $("btn-finish").disabled = on || !session;
    if (on === was) return; // the server's echo of a pause we already show: keep the End confirm open
    $("end-confirm").hidden = true;
    $("pause-acts").hidden = false;
    if (on) {
      $("pause-left").textContent = " · " + $("clock-val").textContent + " left";
      setDot("wait", "Paused. The clock is stopped.");
      $("btn-resume").focus();
    } else if (session) {
      setTalkUi(serverStatus === "listening" ? "idle" : serverStatus);
    }
  }
  function pause() {
    if (!live() || paused) return;
    if (recording) { recording = false; pendingEnd = false; micNode.port.postMessage({ on: false }); }
    stopPlayback();
    if (bubble && !turnDone) markCut();
    setPaused(true);
    ws.send(JSON.stringify({ type: "pause" }));
  }
  function resume() {
    if (!live() || !paused) return;
    ws.send(JSON.stringify({ type: "resume" }));
  }
  function askEnd() {
    if (!live()) return;
    pause();
    $("pause-acts").hidden = true;
    $("end-confirm").hidden = false;
    $("btn-end-no").focus();
  }
  function endNow() {
    if (!live()) return;
    $("btn-end-yes").disabled = true;
    ws.send(JSON.stringify({ type: "abandon" }));
  }
  // Back to the start gate with nothing kept: no debrief, no history, no plan result.
  function endedUi(removed) {
    ended = true;
    session = null;
    paused = false;
    $("veil").hidden = true;
    $("btn-end-yes").disabled = false;
    stopPlayback();
    bubble = null;
    turnDone = true;
    awaitingDebrief = false;
    currentTry = null;
    turns = 0;
    $("trybar").hidden = true;
    CodePad.clearResults();
    for (const id of ["btn-talk", "btn-restart", "btn-finish", "btn-pause", "btn-end"]) $(id).disabled = true;
    $("transcript").replaceChildren();
    $("live").hidden = true;
    $("gate").hidden = false;
    $("btn-begin").disabled = false;
    $("clock-val").textContent = "--:--";
    $("clock").classList.remove("low");
    $("lat-mini").textContent = "";
    renderFlow({ phase: phases[0], hint: 0, read: null, notes: "" });
    showTab("pane-conv");
    setDot("ok", "Interview ended. Nothing was saved" + (removed ? " (the try your review had saved was taken back out of History)." : "."));
  }
  $("btn-pause").addEventListener("click", pause);
  $("btn-resume").addEventListener("click", resume);
  $("btn-end").addEventListener("click", askEnd);
  $("btn-end-ask").addEventListener("click", askEnd);
  $("btn-end-yes").addEventListener("click", endNow);
  $("btn-end-no").addEventListener("click", resume);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && paused && !$("end-confirm").hidden) { e.preventDefault(); resume(); }
  });
  $("btn-restart").addEventListener("click", restart);
  // What to show before a session starts: the coding card if we have it, otherwise a short placeholder.
  // Plan and history problems: fetch the card now so the code pad is ready before you start.
  const cards = {};
  async function previewCard(id) {
    renderProblem({ title: ($("sel-problem").selectedOptions[0] || {}).textContent || "Coding problem", difficulty: "Coding",
      statement: "Getting the problem and its starter code ready (the first time takes a few seconds)…", focus: [] });
    try {
      if (!cards[id]) {
        const r = await fetch(`/api/coding-card?problem=${encodeURIComponent(id)}`);
        const body = await r.json();
        if (!r.ok) throw new Error(body.detail || "Couldn't load the problem.");
        cards[id] = body;
      }
    } catch (e) {
      if ($("sel-problem").value === id && !session) renderProblem({ title: "Coding problem", difficulty: "Coding", statement: e.message + " Press Start interview to try again.", focus: [] });
      return;
    }
    if ($("sel-problem").value !== id || (session && session.mode === "coding" && session.problem.id === id)) return;
    renderProblem(cards[id]);
    CodePad.show(cards[id], true);
    applyPendingCode();
  }

  function previewSelection() {
    const id = $("sel-problem").value;
    const p = problems.find((x) => x.id === id);
    const planCoding = !p && (id.startsWith("prep:") || id.startsWith("history:") || id.startsWith("lib:"));
    CodePad.show(p || null, !!p);
    if (p) applyPendingCode();
    if (p) renderProblem(p);
    else if (planCoding) previewCard(id);
    else {
      const d = designList.find((x) => x.id === id);
      const opt = $("sel-problem").selectedOptions[0];
      const kind = d ? d.kind : id.startsWith("design:") ? "Design" : id.startsWith("behavioral:") ? "Behavioral" : "Coding";
      renderProblem({
        title: d ? d.title : (opt ? opt.textContent : "Practice task"), difficulty: kind,
        statement: "Press Start interview and the interviewer will set this up.", focus: [],
      });
    }
    showBoard(id.startsWith("design:"));
  }
  $("sel-problem").addEventListener("change", () => { previewSelection(); restart(); });
  $("sel-persona").addEventListener("change", restart);

  // ---------- Design board ----------
  // Mermaid is 3 MB, so it loads only when a design round starts.
  let mermaidLoading = null;
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("Couldn't load " + src));
      document.head.append(s);
    });
  }
  function loadDiagram() {
    if (!mermaidLoading) mermaidLoading = loadScript("./vendor/mermaid.min.js").then(() => loadScript("./diagram.js"));
    return mermaidLoading;
  }

  let boardTimer = null;
  let drawTimer = null;
  function sendBoard() {
    if (!ws || ws.readyState !== 1 || !session || session.mode !== "design") return;
    ws.send(JSON.stringify({ type: "board", diagram: $("board-src").value, notes: $("board-notes").value }));
  }
  function drawBoard() {
    loadDiagram().then(() => Diagram.render($("board-preview"), $("board-src").value, $("board-err")))
      .catch((e) => { $("board-err").textContent = e.message; });
  }
  function onBoardInput(e) {
    clearTimeout(boardTimer);
    boardTimer = setTimeout(sendBoard, 500);
    if (e.target.id === "board-src") { clearTimeout(drawTimer); drawTimer = setTimeout(drawBoard, 400); }
  }
  $("board-src").addEventListener("input", onBoardInput);
  $("board-notes").addEventListener("input", onBoardInput);
  // Tab inserts two spaces in the diagram editor instead of leaving the field.
  $("board-src").addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    const t = e.target, a = t.selectionStart;
    t.setRangeText("  ", a, t.selectionEnd, "end");
    onBoardInput(e);
  });
  function showBoard(on) {
    const was = !$("board-panel").hidden;
    $("board-panel").hidden = !on;
    if (!on || was) return;
    sendBoard();
    drawBoard();
  }

  // Launched from a plan design task: start the notes from what you wrote in the plan.
  async function prefillBoardFromPlan() {
    if (!prepTask || !prepTask.problem.startsWith("design:")) return;
    const did = prepTask.problem.split(":").slice(2).join(":");
    try {
      const c = await fetch(`/api/prep/companies/${encodeURIComponent(prepTask.cid)}`).then((r) => r.json());
      const prog = c.progress || {};
      const last = (prog.results || {})[prepTask.key] || {};
      if (!$("board-src").value && last.diagram) $("board-src").value = last.diagram;
      if (!$("board-notes").value) $("board-notes").value = last.board_notes || (prog.inputs || {})["design:" + did] || "";
      if (!$("board-panel").hidden) { drawBoard(); sendBoard(); }
    } catch { /* start empty */ }
  }

  // Launched from a plan coding task: bring back the code saved with it last time.
  let pendingCode = null;
  // Load it into the pad as soon as the pad has its problem (preview or session), once.
  function applyPendingCode() {
    if (pendingCode && CodePad.prefill(pendingCode.code, pendingCode.language, pendingCode.force)) pendingCode = null;
  }
  async function prefillCodeFromPlan() {
    if (redo) {
      // A redo starts from the blank starter, or from the code of the try you picked.
      if (redo.fresh || redo.fromTry) CodePad.clearDrafts(redo.problem);
      if (!redo.fromTry) return;
      try {
        const doc = await fetch(`/api/history/${encodeURIComponent(redo.key)}`).then((r) => r.json());
        const t = (doc.tries || []).find((x) => x.n === redo.fromTry);
        if (t && t.code) { pendingCode = { code: t.code, language: t.language, force: true }; applyPendingCode(); }
      } catch { /* start from the starter */ }
      return;
    }
    if (!prepTask || !prepTask.problem.startsWith("prep:")) return;
    try {
      const c = await fetch(`/api/prep/companies/${encodeURIComponent(prepTask.cid)}`).then((r) => r.json());
      const last = ((c.progress || {}).results || {})[prepTask.key] || {};
      if (last.code) { pendingCode = { code: last.code, language: last.language }; applyPendingCode(); }
    } catch { /* start from the starter */ }
  }

  // ---------- Side tabs: Conversation / Problem / Get help / Flow ----------
  const tabs = [...document.querySelectorAll('.stabs [role="tab"]')];
  function showTab(paneId) {
    for (const t of tabs) {
      const on = t.dataset.pane === paneId;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.dataset.pane).hidden = !on;
      if (on) t.classList.remove("new");
    }
    if (paneId === "pane-conv") scrollDown();
  }
  for (const t of tabs) t.addEventListener("click", () => showTab(t.dataset.pane));
  $("tab-conv").parentElement.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const shown = tabs.filter((t) => !t.hidden);
    const i = shown.indexOf(document.activeElement);
    if (i < 0) return;
    const next = shown[(i + (e.key === "ArrowRight" ? 1 : shown.length - 1)) % shown.length];
    next.focus();
    showTab(next.dataset.pane);
  });
  // Get help is for coding rounds only: its tab follows the panel that Help.show() hides and shows.
  new MutationObserver(() => {
    const off = $("help-panel").hidden;
    $("tab-help").hidden = off;
    if (off && !$("pane-help").hidden) showTab("pane-conv");
  }).observe($("help-panel"), { attributes: true, attributeFilter: ["hidden"] });

  // ---------- Boot ----------
  Help.init({
    send: (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); },
    ready: () => !!(ws && ws.readyState === 1 && session && !paused && session.mode === "coding"),
    getCode: () => CodePad.code(),
    getProblem: () => (session && session.mode === "coding" ? session.problem : null),
    onState: (st) => renderFlow(st),
  });
  CodePad.init({
    send: (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); },
    ready: () => !!(ws && ws.readyState === 1 && session && !paused && session.mode === "coding"),
  });
  renderFlow({ phase: "clarify", hint: 0, read: null, notes: "" });
  prefillBoardFromPlan();
  prefillCodeFromPlan();
  const option = (value, text) => { const o = document.createElement("option"); o.value = value; o.textContent = text; return o; };
  Promise.all([
    fetch("/api/problems").then((r) => r.json()),
    fetch("/api/prep/companies").then((r) => r.json()).catch(() => []),
    fetch("/api/designs").then((r) => r.json()).catch(() => []),
    fetch("/api/library").then((r) => r.json()).catch(() => []),
  ]).then(([list, companies, designs, lib]) => {
    problems = list;
    const coding = document.createElement("optgroup");
    coding.label = "Coding";
    coding.append(...list.map((p) => option(p.id, p.title + " · " + p.difficulty)));
    const beh = document.createElement("optgroup");
    beh.label = "Behavioral";
    beh.append(option("behavioral:general", "General (STAR)"),
      ...companies.filter((c) => c.has_plan).map((c) => option("behavioral:" + c.id, c.name)));
    const des = document.createElement("optgroup");
    des.label = "Design";
    designList = designs;
    des.append(...designs.map((d) => option(d.id, d.title + " · " + d.kind)));
    const libGroup = document.createElement("optgroup");
    libGroup.label = "Your library";
    libGroup.append(...lib.map((p) => option(p.id, p.title + " · " + p.difficulty)));
    $("sel-problem").replaceChildren(coding, ...(lib.length ? [libGroup] : []), des, beh);
    renderProblem(list[0]);
    CodePad.show(list[0], true);
    if (prepTask && prepTask.problem) {
      if (![...$("sel-problem").options].some((o) => o.value === prepTask.problem)) {
        const g = document.createElement("optgroup");
        g.label = "From your plan";
        g.append(option(prepTask.problem, prepTask.label || prepTask.problem));
        $("sel-problem").prepend(g);
      }
      $("sel-problem").value = prepTask.problem;
      previewSelection();
      $("taskbar").hidden = false;
      $("task-label").textContent = prepTask.label || "Practice task";
      $("task-back").href = "./prep.html?c=" + encodeURIComponent(prepTask.cid);
    } else if ((redo && redo.problem) || params.get("problem")) {
      const want = redo ? redo : { problem: params.get("problem"), label: params.get("label") || "" };
      if (![...$("sel-problem").options].some((o) => o.value === want.problem)) {
        const g = document.createElement("optgroup");
        g.label = redo ? "Redo from your history" : "Picked";
        g.append(option(want.problem, want.label || want.problem));
        $("sel-problem").prepend(g);
      }
      $("sel-problem").value = want.problem;
      previewSelection();
    }
  }).catch(() => setDot("bad", "Couldn't load problems. Is the server running?"));
})();
