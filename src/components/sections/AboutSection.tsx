"use client";

import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeader from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { educationData } from "@/lib/data/education";

export default function AboutSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
    >
      <Section ariaLabelledby="about-title">
        <SectionHeader title="About" subtitle="Who I am and where I studied" titleId="about-title" />

        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-5">
          <div className="space-y-4 text-base leading-relaxed text-muted-foreground md:col-span-3">
            <p>
              I’m a software engineer who builds AI products end to end, from retrieval and LLM orchestration to the
              interface people actually use.
            </p>
            <p>
              Today I’m one of three engineers on a founding-stage team at Orris Care, building an AI clinical decision
              support system that is in beta with practicing clinicians. Before that I shipped a Rust model generator for
              the open-source OpenPRA nuclear-safety platform, and built RAG research infrastructure at NC State that cut
              manual literature extraction by 60%.
            </p>
            <p>I like measurable results, reproducible pipelines, and shipping quality gates alongside the code.</p>
          </div>

          <ul className="space-y-4 md:col-span-2" aria-label="Education">
            {educationData.map((edu) => (
              <li key={edu.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-primary/10 p-2 text-primary">
                    <GraduationCap className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {edu.degree}, {edu.field}
                    </h3>
                    <p className="text-sm text-muted-foreground">{edu.school}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {edu.startYear} – {edu.endMonth} {edu.endYear}
                      {edu.gpa && ` · GPA ${edu.gpa}`}
                    </p>
                  </div>
                </div>
                {!!edu.coursework?.length && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label="Relevant coursework">
                    {edu.coursework.map((c) => (
                      <li key={c}>
                        <Badge variant="secondary" className="text-xs">
                          {c}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </motion.div>
  );
}
