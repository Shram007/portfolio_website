"use client";

const skills = {
  Languages: ["TypeScript", "Python", "SQL"],
  Frontend: ["Next.js", "React", "Tailwind"],
  Backend: ["Node.js", "REST", "GraphQL"],
  Tools: ["Git", "Docker", "Vercel"],
  'AI Tools': ["Lovable", "Bolt", "Vercel(v0)", "GitHub Copilot", "Claude Code", "Code Rabbit","Framer Motion"]
};

export default function SkillsSection() {
  return (
    <section aria-labelledby="skills-title" className="mx-auto max-w-5xl px-4 py-16 space-y-8">
      <h2 id="skills-title" className="text-3xl font-semibold">Skills</h2>
      {Object.entries(skills).map(([group, list]) => (
        <div key={group}>
          <h3 className="text-lg font-medium mb-3">{group}</h3>
          <div className="flex flex-wrap gap-2">
            {list.map((s) => (
              <span key={s} className="rounded-md border border-neutral-200 px-3 py-1 text-sm dark:border-neutral-800">
                {s}
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
