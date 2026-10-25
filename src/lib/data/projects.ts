import { Project } from "@/lib/types";

export type { Project };

const rawProjects: Omit<Project, "id">[] = [
  {
    title: "ClinicFlow",
    description: "Turns a doctor's voice recording into a structured SOAP note with audio readback through a three-stage STT, LLM and TTS pipeline. Enforces JSON-only output across 6 clinical keys with a raw-transcript fallback, and ships prompt versioning plus an LLM-as-judge eval pipeline that scores clinical accuracy per release.",
    stack: ["STT", "LLM", "TTS", "LLM-as-judge evals", "Docker", "CI/CD"],
    demoUrl: "https://clinicflow-skeleton.vercel.app/",
    repoUrl: "https://github.com/Shram007/clinicflow-skeleton",
    effect: { bgClass: "bg-neutral-900", animationSpeed: 3, colors: [[167,139,250]], dotSize: 2 }
  },
  {
    title: "Restaurant Voice Hub",
    description: "Voice assistant that takes restaurant orders end to end, with a 5-tool agentic orchestration layer inside ElevenLabs Conversational AI and no human handoff. A real-time CSV knowledge-injection pipeline syncs live Supabase Postgres inventory to the agent, cutting menu updates from hours to seconds with no redeploy.",
    stack: ["React", "TypeScript", "FastAPI", "Python", "ElevenLabs API", "Supabase", "Vercel", "Render"],
    demoUrl: "https://restaurant-voice-hub.vercel.app/",
    repoUrl: "https://github.com/Shram007/restaurant-voice-hub",
    effect: { bgClass: "bg-neutral-900", animationSpeed: 3, colors: [[125,211,252]], dotSize: 2 }
  },
  {
    title: "Travel Agent Atlas",
    description: "Travel-planning agent that switches at runtime across 4 LLMs (Gemini 2.5 Pro, DeepSeek-R1, Llama 3.3, Qwen 2.5) behind one OpenAI-compatible proxy with per-request cost tracking. A ReAct loop dispatches tool calls through a unified router, with parallel Exa neural search for destinations, hotels and flights.",
    stack: ["ReAct agents", "Gemini 2.5 Pro", "DeepSeek-R1", "Llama 3.3", "Qwen 2.5", "Exa"],
    repoUrl: "https://github.com/Shram007/Travel-Agent",
    effect: { bgClass: "bg-neutral-900", animationSpeed: 4, colors: [[56,189,248]], dotSize: 2 }
  },
  {
    title: "Vital View: Your AI Copilot for Doctors",
    description: "Voice-first AI agent that transforms chaotic medical data review into streamlined, clinically-aware briefings for healthcare professionals.",
    stack: ["React", "Node.js", "AI/ML", "Voice Recognition", "Healthcare APIs"],
    demoUrl: "https://drcomd-frontend.onrender.com/",
    repoUrl: "https://github.com/Shram007/VitalView.git",
    effect: { bgClass: "bg-neutral-900", animationSpeed: 4, colors: [[251,191,36]], dotSize: 2 }
  },
  {
    title: "AI QA Engineer",
    description: "AI QA Engineer is a browser- and CLI-based QA automation tool that uses AI agents to run autonomous browser tests, log failures to Sentry, and provide intelligent analysis using LLMs (Claude or GPT-4).",
    stack: ["Python", "OpenAI", "Daytona", "Sentry", "TypeScript", "Browser-use"],
    demoUrl: "https://veridion-delta.vercel.app/",
    repoUrl: "https://github.com/Shram007/veridion.git",
    effect: { bgClass: "bg-neutral-900", animationSpeed: 3, colors: [[34,197,94]], dotSize: 2 }
  },
  {
    title: "Resume Generator",
    description: "Web app that generates ATS-friendly resumes with live preview and conditional form validation.",
    stack: ["React", "Node.js", "Java", "Spring Boot"],
    repoUrl: "https://github.com/Shram007/AWT_project.git",
    image: "/logos/resumegen.jpeg",
    effect: { bgClass: "bg-emerald-900", animationSpeed: 5, colors: [[0,255,255]], dotSize: 2 }
  },
  {
    title: "E-Learning Course Management System",
    description: "Full-stack platform with MySQL + Flask/Django to manage courses, automate grading, and support 100+ users.",
    stack: ["Python", "MySQL", "Flask", "Django"],
    repoUrl: "https://github.com/Shram007/Course-Management-System.git",
    image: "/logos/elearning.jpeg",
    effect: { bgClass: "bg-black", animationSpeed: 3.5, colors: [[236,72,153],[232,121,249]], dotSize: 2 }
  },
  {
    title: "Redesigning Residual Connections",
    description: "Benchmarked ResNet, VGG-16, and AlexNet variants on CIFAR-10, improving gradient stability by 15% and training time by 20%.",
    stack: ["PyTorch", "Matplotlib"],
    image: "/logos/residual.jpeg"
  },
  {
    title: "Traffic Sign Detection",
    description: "CNN model with 95% accuracy on 5,000+ signs and a GUI for real-time classification on CPU.",
    stack: ["TensorFlow", "CNN", "Tkinter/PyQt"],
    image: "/logos/trafficsigns.jpeg"
  },
  {
    title: "Movie Recommendation System",
    description: "Matrix factorization model with temporal awareness, improving recommendation precision by 18%.",
    stack: ["Python", "NumPy", "SciPy"],
    image: "/logos/recsys.jpeg"
  }
];

export const projects: Project[] = rawProjects.map((project, idx) => ({
  ...project,
  id: idx + 1,
}));