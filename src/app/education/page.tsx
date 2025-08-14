"use client";

import { Timeline } from "@/components/ui/timeline";

export default function EducationPage() {
  const data = [
    {
      title: "MS — Computer Science (2023–2025)",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>Focus: ML, Systems; capstone on X.</p>
        </div>
      ),
    },
    {
      title: "BS — Computer Science (2019–2023)",
      content: (
        <div className="prose prose-neutral dark:prose-invert">
          <p>Graduated with honors; projects in web and data engineering.</p>
        </div>
      ),
    },
  ];

  return <main><Timeline data={data} /></main>;
}
