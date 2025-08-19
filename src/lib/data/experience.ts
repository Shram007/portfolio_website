import { WorkExperienceItem } from "@/components/sections/WorkExperience";

export const experiences: WorkExperienceItem[] = [
  {
    id: "1",
    company: "TechCorp Solutions",
    position: "Senior Software Engineer",
    location: "San Francisco, CA",
    startDate: "2022-01",
    current: true,
    description:
      "Lead development of scalable web applications and mentor junior developers. Responsible for architecture decisions and code reviews.",
    achievements: [
      "Improved application performance by 40% through optimization",
      "Led a team of 5 developers on critical projects",
      "Implemented CI/CD pipeline reducing deployment time by 60%",
    ],
    technologies: ["React", "TypeScript", "Node.js", "AWS", "Docker"],
    companyUrl: "https://techcorp.com",
  },
  {
    id: "2",
    company: "StartupXYZ",
    position: "Full Stack Developer",
    location: "Remote",
    startDate: "2020-06",
    endDate: "2021-12",
    current: false,
    description:
      "Developed and maintained full-stack applications using modern web technologies. Collaborated with cross-functional teams to deliver high-quality products.",
    achievements: [
      "Built 3 major features that increased user engagement by 25%",
      "Reduced bug reports by 50% through comprehensive testing",
      "Mentored 2 junior developers",
    ],
    technologies: ["Vue.js", "Python", "PostgreSQL", "Redis", "Kubernetes"],
    companyUrl: "https://startupxyz.com",
  },
  {
    id: "3",
    company: "Digital Agency Pro",
    position: "Frontend Developer",
    location: "New York, NY",
    startDate: "2018-03",
    endDate: "2020-05",
    current: false,
    description:
      "Created responsive web interfaces and collaborated with designers to implement pixel-perfect designs for various client projects.",
    achievements: [
      "Delivered 15+ client projects on time and within budget",
      "Improved website loading speed by 35% on average",
      "Established frontend development best practices",
    ],
    technologies: ["JavaScript", "SCSS", "jQuery", "Webpack", "Git"],
    companyUrl: "https://digitalagencypro.com",
  },
];
