"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { missionSystems, type MissionOption } from "@/lib/data/missionControl";
import { CONTACT_EMAIL, RESUME_URL } from "@/lib/site";

type Phase = "brief" | "puzzle" | "unlocked" | "status" | "report";

const total = missionSystems.length;

const primaryButton =
  "inline-flex min-h-11 items-center rounded-md bg-white px-4 font-sans text-sm font-semibold text-neutral-900 hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400";
const secondaryButton =
  "inline-flex min-h-11 items-center rounded-md border border-neutral-500 px-4 font-sans text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400";

function rankFor(wrong: number, skipped: boolean) {
  if (skipped) return "Mission Observer";
  if (wrong === 0) return "Flight Director";
  return wrong <= 2 ? "Senior Flight Engineer" : "Flight Engineer";
}

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function ProgressBar({ repaired }: { repaired: number }) {
  const percent = Math.round((repaired / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label="Systems repaired"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={repaired}
        className="h-3 flex-1 overflow-hidden rounded-sm bg-white/10"
      >
        <div className="h-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-sm">{percent}%</span>
    </div>
  );
}

export default function MissionControl({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("brief");
  const [index, setIndex] = useState(0);
  const [repaired, setRepaired] = useState(0);
  const [tried, setTried] = useState<MissionOption["key"][]>([]);
  const [hint, setHint] = useState("");
  const [wrong, setWrong] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const system = missionSystems[index];

  const begin = () => {
    startedAt.current = Date.now();
    setPhase("puzzle");
  };

  const finish = useCallback(() => {
    setElapsed(startedAt.current ? Date.now() - startedAt.current : 0);
    setPhase("report");
  }, []);

  const choose = useCallback(
    (option: MissionOption) => {
      if (tried.includes(option.key)) return;
      if (option.correct) {
        setRepaired((n) => n + 1);
        if (tried.length === 0) setFirstTry((n) => n + 1);
        setHint("");
        setPhase("unlocked");
      } else {
        setTried((list) => [...list, option.key]);
        setHint(option.hint ?? "Not quite. Try another fix.");
        setWrong((n) => n + 1);
      }
    },
    [tried]
  );

  const next = () => {
    if (index === total - 1) {
      finish();
      return;
    }
    setIndex(index + 1);
    setTried([]);
    setPhase("status");
  };

  const restart = () => {
    setIndex(0);
    setRepaired(0);
    setTried([]);
    setHint("");
    setWrong(0);
    setFirstTry(0);
    setElapsed(0);
    startedAt.current = 0;
    setPhase("brief");
  };

  // Lock page scroll and return focus to wherever the player came from.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  // Each screen puts focus on its main action, so Enter always moves the game forward.
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("[data-primary]")?.focus();
  }, [phase, index, tried.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        // the palette stays closed while the game is open
        if (e.key.toLowerCase() === "k") {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        const items = panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const current = document.activeElement;
        if (e.shiftKey && current === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && current === last) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key.toLowerCase() === "s" && phase !== "report") {
        finish();
      } else if (phase === "puzzle") {
        const option = system.options.find((o) => o.key === e.key.toUpperCase());
        if (option) choose(option);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [phase, system, choose, finish, onClose]);

  const barTitle = {
    brief: "mission-control ~ ssh shram@orbit",
    puzzle: `system ${index + 1} of ${total} · ${system.name}`,
    unlocked: `system ${index + 1} of ${total} · ${system.name}`,
    status: `ship status · ${repaired} of ${total} online`,
    report: repaired === total ? "mission complete" : "mission report",
  }[phase];

  const nextUntried = system.options.find((o) => !tried.includes(o.key))?.key;
  const complete = repaired === total;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm md:p-6">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mission Control game"
        className="flex h-full w-full max-w-3xl flex-col overflow-hidden border-[#33365c] bg-[#0a0b16] font-mono text-sm leading-relaxed text-neutral-200 shadow-2xl md:h-auto md:max-h-[90dvh] md:rounded-xl md:border md:text-base"
      >
        <div className="flex h-11 shrink-0 items-center gap-2 bg-[#14162b] pl-4 text-xs text-neutral-400">
          <span aria-hidden className="h-3 w-3 rounded-full bg-red-400" />
          <span aria-hidden className="h-3 w-3 rounded-full bg-amber-400" />
          <span aria-hidden className="h-3 w-3 rounded-full bg-emerald-400" />
          <span className="ml-2 min-w-0 flex-1 truncate font-sans">{barTitle}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit game"
            className="inline-flex h-11 w-11 items-center justify-center hover:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-400"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:min-h-[26rem] md:p-7">
          {phase === "brief" && (
            <section aria-label="Mission briefing">
              <p>
                <span className="text-violet-400">MISSION CONTROL</span> <span className="text-neutral-400">v1.0</span>
              </p>
              <p>Connected to Shram&apos;s ship.</p>
              <p className="mt-5">
                <span className="text-red-400">ALERT</span> Astronaut stranded. Launch blocked.
              </p>
              <ul className="mt-4 space-y-1">
                {missionSystems.map((s) => (
                  <li key={s.id} className="grid grid-cols-[1.5rem_9rem_1fr]">
                    <span aria-hidden className="text-red-400">✗</span>
                    <span>{s.name.toUpperCase()}</span>
                    <span>offline</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5">Each failure is modeled on a system Shram has built.</p>
              <p>Repair all {total} to launch.</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" data-primary onClick={begin} className={primaryButton}>
                  Begin mission
                </button>
                <button type="button" onClick={finish} className={secondaryButton}>
                  Skip to report
                </button>
              </div>
              <p className="mt-4 text-xs text-neutral-400">Enter to continue · Esc to exit · S to skip</p>
            </section>
          )}

          {phase === "puzzle" && (
            <section aria-label={`${system.name} repair`}>
              <p>
                <span className="text-red-400">{system.name.toUpperCase()}</span> offline
              </p>
              <p className="mt-1">{system.symptom}</p>
              <pre className="mt-4 overflow-x-auto rounded-lg border border-[#2b2e50] bg-[#14162b] py-3 text-xs md:text-sm">
                <code>
                  {system.code.map((line, i) => (
                    <span key={i} className={`block px-4 ${i === system.badLine ? "bg-red-400/20" : ""}`}>
                      {line}
                    </span>
                  ))}
                </code>
              </pre>
              <div className="mt-4 space-y-2" role="group" aria-label="Choose a fix">
                {system.options.map((option) => {
                  const ruledOut = tried.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      disabled={ruledOut}
                      data-primary={option.key === nextUntried ? "" : undefined}
                      onClick={() => choose(option)}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-xs md:text-sm ${
                        ruledOut
                          ? "border-[#2b2e50] text-neutral-400 line-through"
                          : "border-[#3d4170] hover:border-emerald-400 hover:bg-emerald-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
                      }`}
                    >
                      <span className="text-amber-400">{option.key}</span>
                      <span className="min-w-0 break-words">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              <p role="status" className="mt-3 min-h-11 text-xs text-amber-300 md:text-sm">
                {hint}
              </p>
            </section>
          )}

          {phase === "unlocked" && (
            <section aria-label={`${system.name} repaired`}>
              <p className="text-emerald-400">✓ {system.name.toUpperCase()} ONLINE</p>
              <p>{system.fixedMessage}</p>
              <div className="mt-5 rounded-lg border border-violet-400 bg-violet-400/10 p-4 font-sans">
                <h3 className="font-bold text-white">Unlocked: the real work</h3>
                <p className="mt-1 text-sm leading-relaxed md:text-base">{system.story}</p>
                <ul className="mt-3 grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
                  {system.stats.map((stat) => (
                    <li key={stat.label} className="rounded-lg bg-black/30 p-3">
                      <span className="block text-2xl font-bold leading-none text-violet-300">{stat.value}</span>
                      <span className="mt-2 block text-xs text-neutral-300">{stat.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button type="button" data-primary onClick={next} className={`mt-6 ${primaryButton}`}>
                {index === total - 1 ? "Launch" : "Next system"}
              </button>
            </section>
          )}

          {phase === "status" && (
            <section aria-label="Ship status">
              <h3 className="mb-2 font-bold text-white">SHIP STATUS</h3>
              <ProgressBar repaired={repaired} />
              <ul className="mt-5 divide-y divide-white/10">
                {missionSystems.map((s, i) => (
                  <li key={s.id} className="grid gap-x-4 py-2 sm:grid-cols-[9rem_1fr_6rem]">
                    <span className={i < repaired ? "text-emerald-400" : i === index ? "text-amber-400" : "text-neutral-400"}>
                      <span aria-hidden>{i < repaired ? "✓ " : i === index ? "▶ " : "• "}</span>
                      {s.name}
                    </span>
                    <span>{s.summary}</span>
                    <span className="text-violet-400">{s.source}</span>
                  </li>
                ))}
              </ul>
              <button type="button" data-primary onClick={() => setPhase("puzzle")} className={`mt-6 ${primaryButton}`}>
                Repair {system.name}
              </button>
            </section>
          )}

          {phase === "report" && (
            <section aria-label="Mission report">
              <p className={complete ? "text-emerald-400" : "text-amber-400"}>
                {complete ? "LIFTOFF. Astronaut is home." : "Mission paused. Astronaut is still waiting."}
              </p>
              <h3 className="mt-5 font-bold text-white">MISSION REPORT</h3>
              <dl className="mt-1 grid grid-cols-[11rem_1fr]">
                <dt>Systems repaired</dt>
                <dd className="text-emerald-400">
                  {repaired} / {total}
                </dd>
                <dt>Time</dt>
                <dd className="text-amber-400">{formatTime(elapsed)}</dd>
                <dt>First-try fixes</dt>
                <dd className="text-amber-400">{firstTry}</dd>
                <dt>Rank</dt>
                <dd className="text-violet-400">{rankFor(wrong, !complete)}</dd>
              </dl>
              <h3 className="mt-5 font-bold text-white">YOU MET SHRAM KADIA</h3>
              <p>Software Engineer at Orris Care · MS CS, NC State</p>
              <p>Builds AI products end to end, from retrieval to React.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a data-primary href={RESUME_URL} target="_blank" rel="noopener noreferrer" className={primaryButton}>
                  View resume<span className="sr-only"> (opens in new tab)</span>
                </a>
                <a href="https://github.com/Shram007" target="_blank" rel="noopener noreferrer" className={secondaryButton}>
                  GitHub<span className="sr-only"> (opens in new tab)</span>
                </a>
                <a href={`mailto:${CONTACT_EMAIL}`} className={secondaryButton}>
                  Email Shram
                </a>
                <button type="button" onClick={restart} className={secondaryButton}>
                  Play again
                </button>
                <button type="button" onClick={onClose} className={secondaryButton}>
                  Back to site
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
