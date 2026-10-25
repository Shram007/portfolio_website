"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, ExternalLink } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeader from "@/components/ui/SectionHeader";
import { motion } from "framer-motion";
import { WorkExperienceItem } from "@/lib/types";

interface WorkExperienceProps {
  experiences: WorkExperienceItem[];
}

const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  const [y, m] = dateString.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("en-US", { year: "numeric", month: "short" });
};

const plural = (n: number, unit: string) => `${n} ${unit}${n > 1 ? "s" : ""}`;

function duration(startDate: string, endDate: string | undefined, now: Date | null, current: boolean): string {
  if (current && !now) return "";
  const start = new Date(`${startDate}-01`);
  const end = current && now ? now : new Date(`${endDate ?? startDate}-01`);
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

const WorkExperience: React.FC<WorkExperienceProps> = ({ experiences }) => {
  // "Now" is only known on the client; reading it during render mismatches the prerendered HTML.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
    >
      <Section ariaLabelledby="experience-title">
        <SectionHeader
          title="Work Experience"
          subtitle="Where I've built things and what shipped"
          titleId="experience-title"
        />

        <ol className="relative mx-auto max-w-4xl border-l border-border pl-6 md:pl-8">
          {experiences.map((experience) => (
            <li key={experience.id} className="relative pb-10 last:pb-0">
              <span
                aria-hidden
                className={`absolute -left-[31px] top-2 h-3 w-3 rounded-full border-2 border-primary md:-left-[39px] ${
                  experience.current ? "bg-primary" : "bg-background"
                }`}
              />

              <article className="rounded-xl border border-border bg-card p-5 md:p-6">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{experience.position}</h3>
                    <p className="flex items-center gap-2 text-base font-medium text-primary">
                      {experience.company}
                      {experience.companyUrl && (
                        <a
                          href={experience.companyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${experience.company} website (opens in new tab)`}
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
                      {formatDate(experience.startDate)} – {experience.current ? "Present" : formatDate(experience.endDate || "")}
                    </span>
                    {/* fixed height so the late-arriving duration cannot shift the layout */}
                    <span className="min-h-5 min-w-28 sm:text-right">
                      {duration(experience.startDate, experience.endDate, now, experience.current)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" aria-hidden />
                      {experience.location}
                    </span>
                  </div>
                </header>

                <p className="mt-3 text-sm italic text-muted-foreground">{experience.description}</p>

                <ul className="mt-4 space-y-2">
                  {experience.achievements.map((achievement, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>
                        <Highlighted text={achievement} />
                      </span>
                    </li>
                  ))}
                </ul>

                {experience.technologies.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label="Technologies">
                    {experience.technologies.map((tech) => (
                      <li key={tech}>
                        <Badge variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </li>
          ))}
        </ol>
      </Section>
    </motion.div>
  );
};

export default WorkExperience;
