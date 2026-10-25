import Image from "next/image";
import {
  Bot,
  Link2,
  ListChecks,
  Mic,
  MousePointer2,
  Plug,
  Search,
  Sparkles,
  Terminal,
  Workflow,
  GitBranch,
  type LucideIcon,
} from "lucide-react";
import { skillIcons } from "@/lib/data/skillIcons";

// Concepts and tools without a brand SVG get a neutral built-in glyph.
const fallbackIcons: Record<string, LucideIcon> = {
  LangChain: Link2,
  RAG: Search,
  MCP: Plug,
  "Agent orchestration": Bot,
  "LLM evaluation": ListChecks,
  "Prompt versioning": GitBranch,
  ElevenLabs: Mic,
  Exa: Search,
  "CI/CD": Workflow,
  Linux: Terminal,
  Cursor: MousePointer2,
  "Claude Code": Sparkles,
};

export default function SkillIcon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const src = skillIcons[name];
  if (src) return <Image src={src} alt="" width={32} height={32} className={`${className} object-contain`} />;
  const Fallback = fallbackIcons[name];
  return Fallback ? <Fallback aria-hidden className={className} /> : null;
}
