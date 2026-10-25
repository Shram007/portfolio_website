export interface SkillsData {
  [category: string]: string[];
}

export const skills: SkillsData = {
  Languages: ["Python", "TypeScript", "JavaScript", "Rust", "SQL"],
  Frameworks: ["FastAPI", "Django", "Flask", "Node.js", "React"],
  "AI / LLM": [
    "LangChain",
    "RAG",
    "MCP",
    "Agent orchestration",
    "LLM evaluation",
    "Prompt versioning",
    "ElevenLabs",
    "Exa",
  ],
  Data: ["PostgreSQL", "Supabase", "Redis", "MySQL/MariaDB"],
  "Infra & Tools": ["GCP", "AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Cursor", "Claude Code"],
};
