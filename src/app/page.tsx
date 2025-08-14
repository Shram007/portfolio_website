import ProjectsSection from "@/components/sections/ProjectsSection";
import ExperienceSection from "@/components/sections/ExperienceSection";
import EducationSection from "@/components/sections/EducationSection";
import SkillsSection from "@/components/sections/SkillsSection";
import ContactSection from "@/components/sections/ContactSection";

export default function Home() {
  return (
    <main className="h-dvh snap-y snap-mandatory overflow-y-auto">
      {/* HERO */}
      <section
        id="home"
        className="snap-start min-h-dvh mx-auto max-w-5xl px-4 py-16 flex flex-col justify-center"
      >
        <h1 className="text-4xl font-bold mb-4">Hi, I’m Shram Kadia</h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-prose">
          Software Developer — interactive, accessible web experiences.
        </p>
      </section>

      {/* PROJECTS */}
      <section id="projects" className="snap-start min-h-dvh">
        <ProjectsSection />
      </section>

      {/* SKILLS */}
      <section id="skills" className="snap-start min-h-dvh">
        <SkillsSection />
      </section>

      {/* EXPERIENCE */}
      <section id="experience" className="snap-start min-h-dvh">
        <ExperienceSection />
      </section>

      {/* EDUCATION */}
      <section id="education" className="snap-start min-h-dvh">
        <EducationSection />
      </section>

      {/* CONTACT */}
      <section id="contact" className="snap-start min-h-dvh">
        <ContactSection />
      </section>
    </main>
  );
}
