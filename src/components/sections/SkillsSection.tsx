"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import Section from "@/components/ui/Section";
import SectionHeader from "@/components/ui/SectionHeader";
import ViewToggle from "@/components/ui/ViewToggle";
import { skills } from "@/lib/data/skills";
import { skillIcons } from "@/lib/data/skillIcons";
import { useMediaQuery } from "@/lib/hooks";

const SkillsConstellation = dynamic(() => import("@/components/sections/SkillsConstellation"), { ssr: false });

type View = "list" | "constellation";

export default function SkillsSection() {
  const [view, setView] = useState<View>("list");
  // The constellation needs room; phones always get the list.
  const wide = useMediaQuery("(min-width: 768px)");
  const showConstellation = wide && view === "constellation";

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

        {wide && (
          <div className="mb-10 text-center">
            <ViewToggle
              label="Skills view"
              value={view}
              onChange={setView}
              options={[
                { value: "list", label: "List" },
                { value: "constellation", label: "Constellation" },
              ]}
            />
          </div>
        )}

        {showConstellation ? (
          <SkillsConstellation />
        ) : (
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
                      {skillIcons[skill] && (
                        <Image src={skillIcons[skill]} alt="" width={24} height={24} className="h-6 w-6 object-contain" />
                      )}
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
    </motion.div>
  );
}
