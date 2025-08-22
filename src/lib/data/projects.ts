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
  {
    title: "Reignite: AI Partnership Revival Agent",
    description: "Revive dormant creator partnerships with KPI-aware, HubSpot-ready matching.",
    stack: ["Python", "React", "TypeScript", "scikit-learn (TF-IDF & cosine similarity)", "pandas", "NumPy", "HubSpot API (roadmap integration)"],
    demoUrl: "#",
    repoUrl: "#",
    image: "/projects/rag.jpg",
    effect: { bgClass: "bg-neutral-900", animationSpeed: 3, colors: [[125,211,252]], dotSize: 2 }
  },
  {
    title: "E-Learning Course Management System",
    description: "Full-stack platform with MySQL + Flask/Django to manage courses, automate grading, and support 100+ users.",
    stack: ["Python", "MySQL", "Flask", "Django"],
    demoUrl: "#",
    repoUrl: "#",
    image: "/projects/elearning.jpg",
    effect: { bgClass: "bg-black", animationSpeed: 3.5, colors: [[236,72,153],[232,121,249]], dotSize: 2 }
  },
  {
    title: "Resume Generator",
    description: "Web app that generates ATS-friendly resumes with live preview and conditional form validation.",
    stack: ["React", "Node.js", "Java", "Spring Boot"],
    demoUrl: "#",
    repoUrl: "#",
    image: "/projects/resumegen.jpg",
    effect: { bgClass: "bg-emerald-900", animationSpeed: 5, colors: [[0,255,255]], dotSize: 2 }
  },
  {
    title: "Redesigning Residual Connections",
    description: "Benchmarked ResNet, VGG-16, and AlexNet variants on CIFAR-10, improving gradient stability by 15% and training time by 20%.",
    stack: ["PyTorch", "Matplotlib"],
    demoUrl: "#",
    repoUrl: "#",
    image: "/projects/residual.jpg"
  },
  {
    title: "Traffic Sign Detection",
    description: "CNN model with 95% accuracy on 5,000+ signs and a GUI for real-time classification on CPU.",
    stack: ["TensorFlow", "CNN", "Tkinter/PyQt"],
    demoUrl: "#",
    repoUrl: "#",
    image: "/projects/trafficsigns.jpg"
  },
  {
    title: "Movie Recommendation System",
    description: "Matrix factorization model with temporal awareness, improving recommendation precision by 18%.",
    stack: ["Python", "NumPy", "SciPy"],
    demoUrl: "#",
    repoUrl: "#",
    image: "/projects/recsys.jpg"
  }
];
