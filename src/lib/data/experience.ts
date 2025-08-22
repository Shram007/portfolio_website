import { WorkExperienceItem } from "@/components/sections/WorkExperience";

export const experiences: WorkExperienceItem[] = [
  {
    id: "1",
    company: "North Carolina State University",
    position: "Data Scientist / Research Assistant",
    location: "Raleigh, NC",
    startDate: "2024-07",
    endDate: "2025-03",
    current: false,
    description:
      "Developed AI/ML systems with LangChain, FAISS, and chatbot integrations to support research workflows.",
    achievements: [
       "Spearheaded development of a Retrieval-Augmented Generation (RAG) pipeline using LangChain + FAISS to ingest 200+ scientific PDFs, slashing manual extraction time by 60%.",
       "Optimized ensemble retrieval logic, accelerating query speed by 30% delivered via FastAPI microservice.",
       "Orchestrated Dockerized deployment of a LangChain-powered chatbot, cutting manual workload by 10+ hours weekly.",
    ],
    technologies: [ "Python", "LangChain", "FAISS", "FastAPI", "Docker", "Retrieval-Augmented Generation", "Vector DBs", "CI/CD"],
    companyUrl: "https://ncsu.edu",
  },
  {
    id: "2",
    company: "Resilient Tech",
    position: "Software Engineer",
    location: "Vadodara, India",
    startDate: "2023-01",
    endDate: "2023-05",
    current: false,
    description:
      "Engineered backend solutions and ERP system integrations using Python and MariaDB.",
    achievements: [
      "Migrated critical ERP systems by crafting RESTful Python APIs, minimizing production downtime by 30%.",
      "Hardened Frappe/ERPNext stacks via security audits, sustaining >99% uptime.",
      "Architected MariaDB integration across 5 enterprise rollouts, enabling client-specific modules.",
      "Resolved 100+ customer tickets by modularizing code and optimizing front-end workflows, lifting CSAT 12%."
    ],
    technologies: ["Python", "REST APIs", "ERPNext", "Frappe", "MariaDB", "Redis", "SQL", "JavaScript", "Security Hardening", "Ubuntu", "Agile", "Git"],
    companyUrl: "https://www.resilient.tech/",
  },
  {
    id: "3",
    company: "Sieger Creations",
    position: "Web Developer",
    location: "Vadodara, India",
    startDate: "2022-06",
    endDate: "2022-07",
    current: false,
    description:
      "Created responsive web interfaces and collaborated with designers to implement pixel-perfect designs for various client projects.",
    achievements: [
      "Delivered five production WordPress sites using Local WP dev environment, boosting average session duration 35% and cutting bounce rate 40%.",
      "Revamped mobile-first UI, increasing client retention by 20% and reducing page-load times below 2s."
    ],
    technologies: ["WordPress", "Git", "JavaScript", "HTML", "CSS"],
    companyUrl: "https://siegercreations.com/",
  },
];
