"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, ExternalLink, MapPin } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeader from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { WorkExperienceItem } from "@/lib/types";

interface WorkExperienceProps {
  experiences: WorkExperienceItem[];
}

const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  const [y, m] = dateString.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("en-US", { year: "numeric", month: "short" });
};

const dateRange = (e: WorkExperienceItem) =>
  `${formatDate(e.startDate)} – ${e.current ? "Present" : formatDate(e.endDate || "")}`;

const plural = (n: number, unit: string) => `${n} ${unit}${n > 1 ? "s" : ""}`;

function duration(e: WorkExperienceItem, now: Date | null): string {
  if (e.current && !now) return "";
  const start = new Date(`${e.startDate}-01`);
  const end = e.current && now ? now : new Date(`${e.endDate ?? e.startDate}-01`);
  const months = Math.max(1, Math.round(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  if (months < 12) return plural(months, "month");
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${plural(years, "year")} ${plural(rest, "month")}` : plural(years, "year");
}

/** Bold the numbers so impact is scannable. */
function Highlighted({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\d[\d.,]*%?)/g).map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

/**
 * Roles on the left, the focused role on the right.
 * Hover (mouse), focus, click/tap or arrow keys select a role.
 */
const WorkExperience: React.FC<WorkExperienceProps> = ({ experiences }) => {
  const [active, setActive] = useState(0);
  // "Now" is only known on the client; reading it during render mismatches the prerendered HTML.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const canHover = useMediaQuery("(hover: hover)");
  const reduceMotion = useReducedMotion();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (i: number, moveFocus = false) => {
    setActive(i);
    if (moveFocus) tabRefs.current[i]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = experiences.length - 1;
    const keys: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowRight: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      ArrowLeft: Math.max(active - 1, 0),
      Home: 0,
      End: last,
    };
    if (e.key in keys) {
      e.preventDefault();
      select(keys[e.key], true);
    }
  };

  const role = experiences[active];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
    >
      <Section ariaLabelledby="experience-title">
        <SectionHeader
          title="Work Experience"
          subtitle="My professional journey and key accomplishments"
          titleId="experience-title"
        />

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[300px_1fr] md:gap-8">
          {/* Role list */}
          <div
            role="tablist"
            aria-label="Roles"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0"
          >
            {experiences.map((exp, i) => {
              const selected = i === active;
              return (
                <button
                  key={exp.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  id={`role-tab-${exp.id}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls="role-panel"
                  tabIndex={selected ? 0 : -1}
                  onMouseEnter={() => canHover && select(i)}
                  onFocus={() => select(i)}
                  onClick={() => select(i)}
                  className={cn(
                    "min-w-[230px] shrink-0 snap-start rounded-2xl border p-4 text-left transition-all duration-300 md:min-w-0",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    selected
                      ? "border-primary bg-primary/10 shadow-[0_0_30px_-8px] shadow-primary/40"
                      : "border-border bg-card/50 hover:border-primary/50"
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold leading-snug text-foreground">{exp.position}</span>
                    {exp.current && (
                      <span className="shrink-0 rounded-full border border-emerald-600/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        Current
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{exp.company}</span>
                  <span className={cn("mt-2 block text-xs", selected ? "text-primary" : "text-muted-foreground")}>
                    {dateRange(exp)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Focused role */}
          <div
            role="tabpanel"
            id="role-panel"
            aria-labelledby={`role-tab-${role.id}`}
            className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm md:min-h-[32rem] md:p-8"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={role.id}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{role.position}</h3>
                    <p className="mt-1 flex items-center gap-2 text-base font-semibold text-primary">
                      {role.company}
                      {role.companyUrl && (
                        <a
                          href={role.companyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${role.company} website (opens in new tab)`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden />
                        </a>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:items-end">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" aria-hidden />
                      {dateRange(role)}
                    </span>
                    {/* fixed height so the late-arriving duration cannot shift the layout */}
                    <span className="min-h-5 min-w-28 sm:text-right">{duration(role, now)}</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" aria-hidden />
                      {role.location}
                    </span>
                  </div>
                </header>

                <p className="mt-4 text-sm italic text-muted-foreground">{role.description}</p>

                {!!role.highlights?.length && (
                  <ul className="mt-6 grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]" aria-label="Highlights">
                    {role.highlights.map((h) => (
                      <li key={h.label} className="rounded-xl border border-border bg-primary/10 p-4">
                        <span className="block text-3xl font-bold leading-none text-primary">{h.value}</span>
                        <span className="mt-2 block text-xs leading-snug text-muted-foreground">{h.label}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <ul className="mt-6 space-y-3">
                  {role.achievements.map((achievement, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>
                        <Highlighted text={achievement} />
                      </span>
                    </li>
                  ))}
                </ul>

                {role.technologies.length > 0 && (
                  <ul className="mt-6 flex flex-wrap gap-2" aria-label="Technologies">
                    {role.technologies.map((tech) => (
                      <li key={tech}>
                        <Badge variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Section>
    </motion.div>
  );
};

export default WorkExperience;
