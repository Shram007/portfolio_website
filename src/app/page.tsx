import ProjectsSection from "@/components/sections/ProjectsSection";
import WorkExperience from "@/components/sections/WorkExperience";
import { experiences } from "@/lib/data/experience";
import AboutSection from "@/components/sections/AboutSection";
import SkillsSection from "@/components/sections/SkillsSection";
import ContactSection from "@/components/sections/ContactSection";
import LazyStarfield from "@/components/visuals/LazyStarfield";
import AstronautGuide from "@/components/visuals/AstronautGuide";
import Hero from "@/components/sections/Hero";

export default function Home() {
  return (
    <main id="main" className="relative">
      {/* moving stars background */}
      <LazyStarfield />

      {/* HERO */}
      <section
        id="home"
        className="relative mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-4 pb-28 pt-28 sm:pb-24 md:px-6 lg:px-8"
      >
        <Hero />

        {/* decorative astronaut near the bottom of the hero */}
        <AstronautGuide />
      </section>

      {/* PROJECTS */}
      <section id="projects" className="scroll-mt-16">
        <ProjectsSection />
      </section>

      {/* EXPERIENCE */}
      <section id="experience" className="scroll-mt-16">
        <WorkExperience experiences={experiences} />
      </section>

      {/* ABOUT + EDUCATION */}
      <section id="about" className="scroll-mt-16">
        <AboutSection />
      </section>

      {/* SKILLS */}
      <section id="skills" className="scroll-mt-16">
        <SkillsSection />
      </section>

      {/* CONTACT */}
      <section id="contact" className="scroll-mt-16">
        <ContactSection />
      </section>
    </main>
  );
}
