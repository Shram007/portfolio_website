export interface SkillsData {
  [category: string]: string[];
}

export const skills: SkillsData = {
  Languages: ["Python", "Java", "JavaScript", "C", "C++", "TypeScript", "SQL"],
  Frameworks: ["Flask", "Django", "Angular", ".NET", "Node.js", "React", "Tailwind"],
  Databases: ["PostgreSQL", "MongoDB", "MariaDB", "Redis", "GraphQL"],
  Tools: ["Git", "Docker", "AWS", "GCP", "Kubernetes", "Postman"]
};