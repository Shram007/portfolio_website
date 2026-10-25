"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Search } from "lucide-react";
import { projects } from "@/lib/data/projects";
import { CONTACT_EMAIL, NAV_LINKS, RESUME_URL } from "@/lib/site";

export const OPEN_PALETTE_EVENT = "open-command-palette";

interface Command {
  id: string;
  group: "Go to" | "Projects" | "Actions";
  label: string;
  hint?: string;
  keywords?: string;
  run: () => void;
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function goTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  history.pushState(null, "", `#${id}`);
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const { resolvedTheme, setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const listId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setIndex(0);
    setNotice("");
    openerRef.current?.focus();
  }, []);

  const show = useCallback(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);

  // Ctrl/Cmd+K toggles; nav button fires a custom event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) close();
        else show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, show);
    };
  }, [open, close, show]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const sections: Command[] = [
      { id: "go-home", group: "Go to", label: "Home", run: () => goTo("home") },
      ...NAV_LINKS.map((l) => ({
        id: `go-${l.id}`,
        group: "Go to" as const,
        label: l.label,
        run: () => goTo(l.id),
      })),
    ];
    const projectCmds: Command[] = projects.flatMap((p) => [
      ...(p.demoUrl
        ? [{ id: `p${p.id}-demo`, group: "Projects" as const, label: p.title, hint: "Live demo", keywords: p.stack?.join(" "), run: () => openExternal(p.demoUrl!) }]
        : []),
      ...(p.repoUrl
        ? [{ id: `p${p.id}-repo`, group: "Projects" as const, label: p.title, hint: "Source code", keywords: p.stack?.join(" "), run: () => openExternal(p.repoUrl!) }]
        : []),
    ]);
    const actions: Command[] = [
      {
        id: "theme",
        group: "Actions",
        label: resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        keywords: "theme dark light mode",
        run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
      {
        id: "copy-email",
        group: "Actions",
        label: "Copy email address",
        hint: CONTACT_EMAIL,
        keywords: "contact mail",
        run: async () => {
          try {
            await navigator.clipboard.writeText(CONTACT_EMAIL);
            setNotice("Email copied to clipboard");
          } catch {
            setNotice(`Copy failed. Email: ${CONTACT_EMAIL}`);
          }
        },
      },
      { id: "resume", group: "Actions", label: "Open resume", keywords: "cv", run: () => openExternal(RESUME_URL) },
      { id: "github", group: "Actions", label: "Open GitHub", run: () => openExternal("https://github.com/Shram007") },
      { id: "linkedin", group: "Actions", label: "Open LinkedIn", run: () => openExternal("https://www.linkedin.com/in/shram-kadia") },
    ];
    return [...sections, ...projectCmds, ...actions];
  }, [resolvedTheme, setTheme]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""} ${c.group}`.toLowerCase().includes(q));
  }, [commands, query]);

  const activeIndex = Math.min(index, Math.max(results.length - 1, 0));

  const choose = (cmd: Command | undefined) => {
    if (!cmd) return;
    const keepOpen = cmd.id === "copy-email";
    cmd.run();
    if (!keepOpen) close();
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((activeIndex + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((activeIndex - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      e.preventDefault(); // keep focus in the dialog
    }
  };

  useEffect(() => {
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId]);

  if (!open) return null;

  let lastGroup = "";
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-neutral-500/30 bg-white text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100"
      >
        <div className="flex items-center gap-3 border-b border-neutral-500/20 px-4">
          <Search className="h-4 w-4 shrink-0 text-neutral-600 dark:text-neutral-400" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
              setNotice("");
            }}
            onKeyDown={onInputKey}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results.length ? `${listId}-${activeIndex}` : undefined}
            aria-autocomplete="list"
            aria-label="Search commands"
            placeholder="Search sections, projects, actions…"
            className="h-14 w-full bg-transparent text-base outline-none placeholder:text-neutral-600 dark:placeholder:text-neutral-400"
          />
          <kbd className="hidden rounded border border-neutral-500/40 px-1.5 py-0.5 text-xs text-neutral-600 dark:text-neutral-400 sm:block">Esc</kbd>
        </div>

        <ul id={listId} role="listbox" aria-label="Commands" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-neutral-600 dark:text-neutral-400">No results</li>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <li key={c.id} role="presentation">
                {header && (
                  <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">{header}</div>
                )}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => choose(c)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-3 text-sm ${
                    i === activeIndex ? "bg-violet-500/15 text-violet-700 dark:text-violet-300" : ""
                  }`}
                >
                  <span>{c.label}</span>
                  {c.hint && <span className="truncate text-xs text-neutral-600 dark:text-neutral-400">{c.hint}</span>}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-neutral-500/20 px-4 py-2 text-xs text-neutral-600 dark:text-neutral-400">
          <span>↑↓ navigate · Enter select · Ctrl/⌘ K toggle</span>
          <span role="status" aria-live="polite">{notice}</span>
        </div>
      </div>
    </div>
  );
}
