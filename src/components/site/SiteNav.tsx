"use client";

import { useEffect, useState } from "react";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { OPEN_PALETTE_EVENT } from "@/components/site/CommandPalette";
import { useTheme } from "next-themes";
import { NAV_LINKS, RESUME_URL, SITE_NAME } from "@/lib/site";

const linkClass =
  "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-neutral-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";

function SearchButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm transition-colors hover:bg-neutral-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      aria-label="Open command palette (Ctrl K)"
      aria-keyshortcuts="Control+K Meta+K"
    >
      <Search className="h-4 w-4" aria-hidden />
      {/* hint drawn with CSS so the button has no visible text that could disagree with its accessible name */}
      <span aria-hidden className="hidden rounded border border-neutral-500/40 px-1.5 py-0.5 font-mono text-xs text-neutral-600 after:content-['Ctrl_K'] lg:block dark:text-neutral-400" />
    </button>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-neutral-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      aria-label={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme"}
    >
      {mounted && isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  // Highlight the section nearest the middle of the viewport.
  useEffect(() => {
    const ids = ["home", ...NAV_LINKS.map((l) => l.id)];
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-500/20 bg-background/70 backdrop-blur-md">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6 lg:px-8">
        <a
          href="#home"
          className="inline-flex min-h-11 items-center rounded-md text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          {SITE_NAME}
        </a>

        <div className="hidden items-center gap-1 md:flex">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  aria-current={active === link.id ? "location" : undefined}
                  className={`${linkClass} ${active === link.id ? "text-violet-500" : ""}`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <a href={RESUME_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} border border-neutral-500/40`}>
            Resume
          </a>
          <SearchButton />
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <SearchButton />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-neutral-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-neutral-500/20 bg-background/95 px-4 pb-4 md:hidden">
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  onClick={() => setOpen(false)}
                  aria-current={active === link.id ? "location" : undefined}
                  className={`${linkClass} w-full ${active === link.id ? "text-violet-500" : ""}`}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a href={RESUME_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} w-full`}>
                Resume
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
