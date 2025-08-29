"use client";

import ProjectsSection from "@/components/sections/ProjectsSection";
import WorkExperience from "@/components/sections/WorkExperience";
import { experiences } from "@/lib/data/experience";
import EducationSection from "@/components/sections/EducationSection";
import SkillsSection from "@/components/sections/SkillsSection";
import ContactSection from "@/components/sections/ContactSection";
import Starfield from "@/components/visuals/Starfield";
import AstronautGuide from "@/components/visuals/AstronautGuide";
import { Typewriter } from "react-simple-typewriter";

export default function Home() {
  return (
    <main className="relative h-dvh snap-y snap-mandatory overflow-y-auto">
      {/* moving stars background */}
      <Starfield />

      {/* HERO */}
      <section
        id="home"
        className="snap-start min-h-dvh mx-auto max-w-5xl px-4 py-16 flex flex-col justify-center"
      >
        <h1 className="text-4xl font-bold mb-4">Hi, I’m Shram Kadia</h1>

        <p className="text-lg text-neutral-300 dark:text-neutral-300 mb-2">
          <Typewriter
            words={[
              "Software Developer",
              "Data Enthusiast",
              "ML Engineer",
            ]}
            loop={0}
            cursor
            cursorStyle="|"
            typeSpeed={70}
            deleteSpeed={40}
            delaySpeed={1600}
          />
        </p>

        <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-prose">
          Interactive, accessible web experiences.
        </p>

        {/* astronaut wanderer just above dock */}
        <AstronautGuide />
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
        <WorkExperience experiences={experiences} />
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
