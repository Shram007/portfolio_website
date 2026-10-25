"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { projects } from "@/lib/data/projects";

const FACE = 200; // card width / height (px)
const GAP = 28;
const count = projects.length;
const STEP = 360 / count;
const RADIUS = Math.round((FACE + GAP) / (2 * Math.tan(Math.PI / count)));

const initials = (title: string) =>
  title
    .split(/[\s:]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

/** Which card faces the viewer for a given rotation (degrees). */
const frontIndex = (rotation: number) => (((Math.round(-rotation / STEP) % count) + count) % count);

function Detail({ index, onClose }: { index: number; onClose: () => void }) {
  const project = projects[index];
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-neutral-900 text-white md:flex-row"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close project details"
          className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-violet-400"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="relative h-48 shrink-0 md:h-auto md:w-1/2">
          {project.image ? (
            <Image src={project.image} alt={`Screenshot of ${project.title}`} fill sizes="(max-width: 768px) 100vw, 384px" className="object-cover" />
          ) : (
            <div aria-hidden className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600/40 to-sky-500/40 text-6xl font-bold">
              {initials(project.title)}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <h3 className="mb-3 pr-10 text-2xl font-bold">{project.title}</h3>
          {project.description && <p className="mb-4 text-neutral-300">{project.description}</p>}
          {!!project.stack?.length && (
            <ul className="mb-4 flex flex-wrap gap-2" aria-label="Tech stack">
              {project.stack.map((t) => (
                <li key={t} className="rounded-md border border-neutral-600 px-2 py-1 text-xs text-neutral-300">
                  {t}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-md bg-white px-4 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
              >
                Demo<span className="sr-only"> (opens in new tab)</span>
              </a>
            )}
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-md border border-neutral-500 px-4 text-sm font-medium hover:bg-white/10"
              >
                Repo<span className="sr-only"> (opens in new tab)</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Optional 3D showcase of every project. Enhancement only: the grid remains the default view. */
export default function ProjectsCarousel3D() {
  const rotation = useMotionValue(0);
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const spin = useRef<ReturnType<typeof animate> | null>(null);

  const rotateTo = useCallback(
    (target: number) => {
      spin.current?.stop();
      spin.current = animate(rotation, target, { type: "spring", stiffness: 70, damping: 18 });
    },
    [rotation]
  );
  const turn = (dir: 1 | -1) => rotateTo(Math.round(rotation.get() / STEP) * STEP - dir * STEP);

  useEffect(() => rotation.on("change", (v) => setFront(frontIndex(v))), [rotation]);

  // Slow idle spin, paused while interacting or when a project is open.
  useEffect(() => {
    if (paused || open !== null) return;
    const id = setInterval(() => rotation.set(rotation.get() - 0.12), 16);
    return () => clearInterval(id);
  }, [paused, open, rotation]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") turn(-1);
    if (e.key === "ArrowRight") turn(1);
  };

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={handleKey}
    >
      <p className="sr-only" aria-live="polite">
        Showing {projects[front].title}
      </p>

      <div className="relative mx-auto h-[360px] w-full overflow-hidden" style={{ perspective: "1200px" }}>
        <motion.div
          className="absolute left-1/2 top-1/2 cursor-grab active:cursor-grabbing"
          style={{
            width: FACE,
            height: FACE,
            marginLeft: -FACE / 2,
            marginTop: -FACE / 2,
            transformStyle: "preserve-3d",
            rotateY: rotation,
            touchAction: "pan-y",
          }}
          onPanStart={() => spin.current?.stop()}
          onPan={(_, info) => rotation.set(rotation.get() + info.delta.x * 0.4)}
          onPanEnd={(_, info) => rotateTo(Math.round((rotation.get() + info.velocity.x * 0.05) / STEP) * STEP)}
        >
          {projects.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Open details: ${p.title}`}
              className="absolute inset-0 overflow-hidden rounded-xl border border-neutral-500/40 bg-neutral-800 text-left shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500"
              style={{
                transform: `rotateY(${i * STEP}deg) translateZ(${RADIUS}px)`,
                backfaceVisibility: "hidden",
              }}
            >
              {p.image ? (
                <Image src={p.image} alt="" fill sizes="200px" className="pointer-events-none object-cover" />
              ) : (
                <span aria-hidden className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600/50 to-sky-500/50 text-5xl font-bold text-white">
                  {initials(p.title)}
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8 text-sm font-semibold text-white">
                {p.title}
              </span>
            </button>
          ))}
        </motion.div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => turn(-1)}
          aria-label="Previous project"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-500/50 hover:bg-neutral-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="min-w-48 text-center text-sm font-medium" aria-hidden>
          {projects[front].title}
        </span>
        <button
          type="button"
          onClick={() => turn(1)}
          aria-label="Next project"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-500/50 hover:bg-neutral-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-neutral-600 dark:text-neutral-400">Drag, use the arrows, or press ← → to rotate. Click a card for details.</p>

      {open !== null && <Detail index={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
