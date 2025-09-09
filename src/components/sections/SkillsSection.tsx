"use client";

const skills = {
  Languages: ["TypeScript", "Python", "SQL"],
  Frontend: ["Next.js", "React", "Tailwind"],
  Backend: ["Node.js", "REST", "GraphQL"],
  Tools: ["Git", "Docker", "Vercel"],
  'AI Tools': ["Lovable", "Bolt", "Vercel(v0)", "GitHub Copilot", "Claude Code", "Code Rabbit", "Framer Motion"]
};

export default function SkillsSection() {
  return (
    <section aria-labelledby="skills-title" className="mx-auto max-w-7xl px-4 py-16">
      <div className="mb-12 text-center">
        <h2 id="skills-title" className="mb-4 text-3xl font-bold">Skills</h2>
        <p className="text-neutral-600 dark:text-neutral-400">Technical expertise and tools I work with</p>
      </div>
      <div className="mx-auto" style={{ maxWidth: "1074px" }}>
        <div className="space-y-8">
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
    </section>
  );
}