
"use client";
import Section from "@/components/ui/Section";
import SectionHeader from "@/components/ui/SectionHeader";
import { motion } from "framer-motion";

const skills = {
  Languages: ["TypeScript", "Python", "SQL"],
  Frontend: ["Next.js", "React", "Tailwind"],
  Backend: ["Node.js", "REST", "GraphQL"],
  Tools: ["Git", "Docker", "Vercel"],
  'AI Tools': ["Lovable", "Bolt", "Vercel(v0)", "GitHub Copilot", "Claude Code", "Code Rabbit", "Framer Motion"]
};

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
        <div className="mx-auto" style={{ maxWidth: "1074px" }}>
          <div className="space-y-4 md:space-y-6">
          {Object.entries(skills).map(([group, list]) => (
            <div key={group}>
              <h3 className="text-lg font-medium mb-3">{group}</h3>
              <div className="flex flex-wrap gap-2">
                {list.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md border border-neutral-200 dark:border-neutral-800 px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-800/50"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
    </motion.div>
  );
}