export type Project = {
  title: string;
  description?: string;
  stack?: string[];
  repoUrl?: string;
  demoUrl?: string;
  effect?: { bgClass?: string; animationSpeed?: number; colors?: number[][]; dotSize?: number; opacities?: number[] };
  image?: string; // 👈 add this
};

export const projects: Project[] = [
  { title: "Project A", description: "A short one-liner about value delivered.",
    stack: ["Next.js","TypeScript","Tailwind"], demoUrl: "#", repoUrl: "#",
    image: "/projects/a.jpg",
    effect: { bgClass: "bg-neutral-900", animationSpeed: 3, colors: [[125,211,252]], dotSize: 2 } },
  { title: "Project B", description: "Another concise description.",
    stack: ["Node","Postgres"], demoUrl: "#", repoUrl: "#",
    image: "/projects/b.jpg",
    effect: { bgClass: "bg-black", animationSpeed: 3.5, colors: [[236,72,153],[232,121,249]], dotSize: 2 } },
  { title: "Project C", description: "What it does and why it matters.",
    stack: ["React","R3F"], demoUrl: "#", repoUrl: "#",
    image: "/projects/c.jpg",
    effect: { bgClass: "bg-emerald-900", animationSpeed: 5, colors: [[0,255,255]], dotSize: 2 } },
  { title: "Project D", description: "Realtime dashboard for X.",
    stack: ["Next.js","WebSockets"], demoUrl: "#", repoUrl: "#",
    image: "/projects/d.jpg" },
  { title: "Project E", description: "Pipeline that processes Y.",
    stack: ["Python","Airflow"], demoUrl: "#", repoUrl: "#",
    image: "/projects/e.jpg" },
  { title: "Project F", description: "3D visualizer for Z.",
    stack: ["React","R3F"], demoUrl: "#", repoUrl: "#",
    image: "/projects/f.jpg" },
];
