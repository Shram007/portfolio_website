export type Project = {
  id: number;
  title: string;
  description?: string;
  stack?: string[];
  repoUrl?: string;
  demoUrl?: string;
  effect?: { bgClass?: string; animationSpeed?: number; colors?: number[][]; dotSize?: number; opacities?: number[] };
  image?: string;
};

export const projects: Project[] = [
  {
    id: 1,
    title: "Reignite: AI Partnership Revival Agent",
    description: "Revive dormant creator partnerships with KPI-aware, HubSpot-ready matching.",
    stack: ["Python", "React", "TypeScript", "scikit-learn (TF-IDF & cosine similarity)", "pandas", "NumPy", "HubSpot API (roadmap integration)"],
    demoUrl: "https://spark-partner-ai.lovable.app/",
    repoUrl: "https://github.com/Shram007/spark-partner-ai.git",
    // image: "/projects/rag.jpg",
    effect: { bgClass: "bg-neutral-900", animationSpeed: 3, colors: [[125,211,252]], dotSize: 2 }
  },
  {
    id: 2,
    title: "Co MD: Your AI Copilot for Doctors",
    description: "Voice-first AI agent that transforms chaotic medical data review into streamlined, clinically-aware briefings for healthcare professionals.",
    stack: ["React", "Node.js", "AI/ML", "Voice Recognition", "Healthcare APIs"],
    demoUrl: "https://drcomd-frontend.onrender.com/",
    repoUrl: "https://github.com/Shram007/DRcoMD.git",
    // image: "/projects/drcomd.jpg",
    effect: { bgClass: "bg-neutral-900", animationSpeed: 4, colors: [[251,191,36]], dotSize: 2 }
  },
  {
    id: 3,
    title: "Video Bounty Platform",
    description: "AI-powered marketplace connecting video requesters with creators. Uses vector embeddings of video keyframes and captions for intelligent matching and automated submission verification.",
    stack: ["Next.js", "TypeScript", "Vector Database", "AI/ML", "Computer Vision", "OpenAI", "Embeddings", "Video Processing"],
    repoUrl: "https://github.com/Shram007/video_bounty.git",
    // image: "/projects/videobounty.jpg",
    effect: { bgClass: "bg-neutral-900", animationSpeed: 3.5, colors: [[34,197,94]], dotSize: 2 }
  },
  {
    id: 4,
    title: "Resume Generator",
    description: "Web app that generates ATS-friendly resumes with live preview and conditional form validation.",
    stack: ["React", "Node.js", "Java", "Spring Boot"],
    repoUrl: "https://github.com/Shram007/AWT_project.git",
    image: "/logos/resumegen.jpeg",
    effect: { bgClass: "bg-emerald-900", animationSpeed: 5, colors: [[0,255,255]], dotSize: 2 }
  },
  {
    id: 5,
    title: "E-Learning Course Management System",
    description: "Full-stack platform with MySQL + Flask/Django to manage courses, automate grading, and support 100+ users.",
    stack: ["Python", "MySQL", "Flask", "Django"],
    repoUrl: "https://github.com/Shram007/Course-Management-System.git",
    image: "/logos/elearning.jpeg",
    effect: { bgClass: "bg-black", animationSpeed: 3.5, colors: [[236,72,153],[232,121,249]], dotSize: 2 }
  },
  {
    id: 6,
    title: "Redesigning Residual Connections",
    description: "Benchmarked ResNet, VGG-16, and AlexNet variants on CIFAR-10, improving gradient stability by 15% and training time by 20%.",
    stack: ["PyTorch", "Matplotlib"],
    image: "/logos/residual.jpeg"
  },
  {
    id: 7,
    title: "Traffic Sign Detection",
    description: "CNN model with 95% accuracy on 5,000+ signs and a GUI for real-time classification on CPU.",
    stack: ["TensorFlow", "CNN", "Tkinter/PyQt"],
    image: "/logos/trafficsigns.jpeg"
  },
  {
    id: 8,
    title: "Movie Recommendation System",
    description: "Matrix factorization model with temporal awareness, improving recommendation precision by 18%.",
    stack: ["Python", "NumPy", "SciPy"],
    image: "/logos/recsys.jpeg"
  }
];