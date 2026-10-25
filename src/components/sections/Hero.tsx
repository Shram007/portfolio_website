import Image from "next/image";
import { ArrowRight, FileText, Github, Linkedin } from "lucide-react";
import { RESUME_URL } from "@/lib/site";

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";

const social =
  "inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-neutral-600 transition-colors hover:text-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:text-neutral-300";

export default function Hero() {
  return (
    <div className="flex flex-col items-center gap-8 text-center md:flex-row md:gap-10 md:text-left">
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
        <h1 className="mb-3 text-4xl font-bold md:text-6xl">Hi, I’m Shram Kadia</h1>
        <p className="mb-2 text-lg font-medium text-violet-600 dark:text-violet-400 md:text-xl">
          Software Engineer at Orris Care · MS CS, NC State
        </p>
        <p className="max-w-prose text-base leading-relaxed text-neutral-600 dark:text-neutral-300 md:text-lg">
          I build AI products end to end: RAG pipelines, LLM agents and voice apps, from retrieval to React.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
          <a
            href="#projects"
            className={`${button} bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200`}
          >
            View projects <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <a
            href={RESUME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${button} border border-neutral-500/50 hover:bg-neutral-500/10`}
          >
            <FileText className="h-4 w-4" aria-hidden /> Resume
            <span className="sr-only"> (opens in new tab)</span>
          </a>
          <a href="#contact" className={`${button} border border-neutral-500/50 hover:bg-neutral-500/10`}>
            Contact me
          </a>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-x-2 md:justify-start">
          <a href="https://github.com/Shram007" target="_blank" rel="noopener noreferrer" className={social}>
            <Github className="h-4 w-4" aria-hidden /> GitHub
            <span className="sr-only"> (opens in new tab)</span>
          </a>
          <a
            href="https://www.linkedin.com/in/shram-kadia"
            target="_blank"
            rel="noopener noreferrer"
            className={social}
          >
            <Linkedin className="h-4 w-4" aria-hidden /> LinkedIn
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
