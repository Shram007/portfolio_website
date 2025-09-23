
"use client";
import Section from "@/components/ui/Section";
import SectionHeader from "@/components/ui/SectionHeader";
import SkillNode from "@/components/ui/SkillNode";
import { motion } from "framer-motion";
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
        <div className="mx-auto" style={{ maxWidth: "1074px" }}>
          <div className="space-y-8 md:space-y-12">
            {Object.entries(skills).map(([group, list], groupIndex) => (
              <motion.div
                key={group}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: groupIndex * 0.2,
                  ease: [0.32, 0.72, 0, 1]
                }}
              >
                <h3 className="text-lg font-medium mb-6 text-center md:text-left">{group}</h3>
                <div className="flex flex-wrap justify-center md:justify-start gap-6 md:gap-8">
                  {list.map((skill, skillIndex) => (
                    <SkillNode
                      key={skill}
                      name={skill}
                      delay={groupIndex * list.length + skillIndex}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>
    </motion.div>
  );
}