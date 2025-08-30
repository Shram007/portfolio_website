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

export const educationData: Education[] = [
  {
    id: "1",
    degree: "Master of Science",
    field: "Computer Science",
    school: "North Carolina State University",
    location: "Raleigh, NC",
    startMonth: "August",
    startYear: "2023",
    endMonth: "May",
    endYear: "2025",
    status: "completed",
    gpa: "3.6 / 4",
    description: "Focus: ML, Systems; capstone on AI applications in distributed systems.",
    coursework: ["Machine Learning", "Computer Graphics", "Cloud Computing", "Software Engineering"],
    //achievements: ["Research Assistant"]
  },
  {
    id: "2",
    degree: "Bachelor of Science",
    field: "Computer Science",
    school: "University of Mumbai",
    location: "Mumbai, India",
    startMonth: "August",
    startYear: "2019",
    endMonth: "May",
    endYear: "2023",
    status: "completed",
    gpa: "9.6 / 10",
    description: "Graduated with Honors. Focused on web development and data engineering projects.",
    coursework: ["Data Structures", "Algorithms", "Database Systems", "Web Development", "Computer Networks"],
    //achievements: ["Graduated with Honors", "Computer Science Society President", "Best Project Award"]
  }
];