"use client";

import Timeline from "@/components/ui/timeline";
import Section from "@/components/ui/Section";
import SectionHeader from "@/components/ui/SectionHeader";
import { motion } from "framer-motion";

export default function EducationSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
    >
      <Section ariaLabelledby="education-title">
        <SectionHeader
          title="Education"
          subtitle="My academic journey and qualifications"
          titleId="education-title"
        />
        <div className="mx-auto max-w-4xl">
          <Timeline />
        </div>
      </Section>
    </motion.div>
  );
}
