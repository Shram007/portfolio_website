"use client";

import { Timeline } from "@/components/ui/timeline";

export default function ExperiencePage() {
  const data = [
    {
      title: "2025 — Software Developer @ Company",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>Built feature X, improved performance by 35%, owned end-to-end shipping.</p>
          <ul>
            <li>Led migration to Next.js App Router and optimized CI</li>
            <li>Implemented analytics events & dashboards</li>
          </ul>
        </div>
      ),
    },
    {
      title: "2024 — Data/ML Intern @ Company",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>Prototyped ML pipeline, automated labeling, delivered interactive dashboards.</p>
        </div>
      ),
    },
  ];

  return <main><Timeline data={data} /></main>;
}
