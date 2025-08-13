export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Hi, I'm Shram Kadia</h1>
      <p className="text-lg text-neutral-600 dark:text-neutral-300 mb-10">
        Software Developer | Building interactive, responsive web experiences.
      </p>

      {/* Links to sections */}
      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { href: "/projects", label: "Projects" },
          { href: "/experience", label: "Experience" },
          { href: "/education", label: "Education" },
          { href: "/skills", label: "Skills" },
          { href: "/contact", label: "Contact" },
        ].map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="rounded-lg border border-neutral-200 px-4 py-3 transition hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            {l.label} →
          </a>
        ))}
      </section>
    </main>
  );
}
