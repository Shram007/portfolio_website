"use client";

import { Timeline } from "@/components/ui/timeline";

export default function ExperienceSection() {
  const data = [
    {
      title: "2025 — Software Developer @ Company",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>Built feature X, improved performance by 35%.</p>
          <ul>
            <li>Led migration to App Router</li>
            <li>Implemented analytics dashboards</li>
          </ul>
        </div>
      ),
    },
    {
      title: "2024 — Data/ML Intern @ Company",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>Prototyped ML pipeline and automated labeling.</p>
        </div>
      ),
    },
  ];
  return (
    <section aria-labelledby="experience-title">
      <h2 id="experience-title" className="sr-only">Experience</h2>
      <Timeline data={data} />
    </section>
  );
}
