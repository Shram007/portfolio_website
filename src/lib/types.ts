// Shared type definitions for the portfolio website

export interface Project {
  id: number;
  title: string;
  description?: string;
  stack?: string[];
  repoUrl?: string;
  demoUrl?: string;
  effect?: {
    bgClass?: string;
    animationSpeed?: number;
    colors?: number[][];
    dotSize?: number;
    opacities?: number[];
  };
  image?: string;
}

export interface ProjectCardProps {
  title: string;
  description?: string;
  stack?: string[];
  repoUrl?: string;
  demoUrl?: string;
  effect?: {
    bgClass?: string;
    animationSpeed?: number;
    colors?: number[][];
    dotSize?: number;
    opacities?: number[];
  };
  className?: string;
}

export interface SkillsData {
  [category: string]: string[];
}

export interface WorkExperienceItem {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string; // YYYY-MM
  endDate?: string;  // YYYY-MM (optional when current=true)
  current: boolean;
  description: string;
  achievements: string[];
  technologies: string[];
  companyUrl?: string;
}

export interface Education {
  id: string;
  degree: string;
  field: string;
  school: string;
  location: string;
  startMonth?: string;
  startYear: string;
  endMonth?: string;
  endYear: string;
  status: "completed" | "in-progress";
  gpa?: string;
  achievements?: string[];
  coursework?: string[];
  description?: string;
}