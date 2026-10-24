"use client";

import ProjectsSection from "@/components/sections/ProjectsSection";
import WorkExperience from "@/components/sections/WorkExperience";
import { experiences } from "@/lib/data/experience";
import EducationSection from "@/components/sections/EducationSection";
import SkillsSection from "@/components/sections/SkillsSection";
import ContactSection from "@/components/sections/ContactSection";
import LazyStarfield from "@/components/visuals/LazyStarfield";
import AstronautGuide from "@/components/visuals/AstronautGuide";
import Image from "next/image";
import { Typewriter } from "react-simple-typewriter";

export default function Home() {
  return (
    <main className="relative h-dvh snap-y snap-mandatory overflow-y-auto">
      {/* moving stars background */}
      <LazyStarfield />

      {/* HERO */}
      <section
        id="home"
        className="snap-start min-h-dvh mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-16 md:py-20 lg:py-24 flex flex-col justify-center"
      >
        {/* Profile Photo */}
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
          <Image
            src="/logos/shram_profile_pic.jpeg"
            alt="Portrait of Shram Kadia"
            width={256}
            height={256}
            sizes="(max-width: 768px) 192px, 256px"
            priority
            className="h-48 w-48 shrink-0 rounded-full object-cover md:h-64 md:w-64"
          />

          <div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">Hi, I’m Shram Kadia</h1>

            <p className="text-base md:text-lg text-neutral-400 mb-2">
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

            <p className="text-base leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-prose">
              I build software that makes a difference.
            </p>

            {/* Social Links */}
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 md:justify-start">
              <a
                href="https://www.linkedin.com/in/shram-kadia"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-500 hover:underline"
              >
                LinkedIn
              </a>
              <a
                href="https://github.com/Shram007"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500 hover:underline"
              >
                GitHub
              </a>
              <a
                href="https://drive.google.com/file/d/1SXvlEshkiYUAw8GlIQxIKWQWz-aR-AcD/view?usp=sharing" // Replace with the actual Google Drive link to your resume
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:underline"
              >
                View Resume
              </a>
            </div>
          </div>
        </div>

        {/* astronaut wanderer just above dock */}
        <AstronautGuide />
      </section>

      {/* PROJECTS */}
      <section id="projects" className="snap-start min-h-dvh">
        <ProjectsSection />
      </section>

      {/* EXPERIENCE */}
      <section id="experience" className="snap-start min-h-dvh">
        <WorkExperience experiences={experiences} />
      </section>

      {/* EDUCATION */}
      <section id="education" className="snap-start min-h-dvh">
        <EducationSection />
      </section>

      {/* SKILLS */}
      <section id="skills" className="snap-start min-h-dvh">
        <SkillsSection />
      </section>

      {/* CONTACT */}
      <section id="contact" className="snap-start min-h-dvh">
        <ContactSection />
      </section>
    </main>
  );
}
