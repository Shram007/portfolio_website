"use client";

import Timeline from "@/components/ui/timeline";

export default function EducationSection() {
  return (
    <section aria-labelledby="education-title" className="mx-auto max-w-7xl px-4 py-16">
      <div className="mb-12 text-center">
        <h2 id="education-title" className="mb-4 text-3xl font-bold">Education</h2>
        <p className="text-neutral-600 dark:text-neutral-400">My academic journey and qualifications</p>
      </div>
      <div className="mx-auto" style={{ maxWidth: "1074px" }}>
        <Timeline/>
      </div>
    </section>
  );
}
