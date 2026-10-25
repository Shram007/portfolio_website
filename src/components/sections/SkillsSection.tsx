"use client";

import { motion } from "framer-motion";
import Section from "@/components/ui/Section";
import SectionHeader from "@/components/ui/SectionHeader";
import SkillIcon from "@/components/ui/SkillIcon";
import { skills } from "@/lib/data/skills";

export default function SkillsSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
    >
      <Section ariaLabelledby="skills-title">
        <SectionHeader
          title="Skills"
          subtitle="Technical expertise and tools I work with"
          titleId="skills-title"
        />

        <div className="mx-auto max-w-5xl space-y-10">
          {Object.entries(skills).map(([group, list]) => (
            <div key={group}>
              <h3 className="mb-4 text-center text-lg font-medium md:text-left">{group}</h3>
              <ul className="flex flex-wrap justify-center gap-3 md:justify-start">
                {list.map((skill) => (
                  <li
                    key={skill}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white/60 py-2 pl-3 pr-4 text-sm dark:border-neutral-700 dark:bg-neutral-900/60"
                  >
                    <SkillIcon name={skill} />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </motion.div>
  );
}
