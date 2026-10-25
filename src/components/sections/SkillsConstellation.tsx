"use client";

import Image from "next/image";
import { useState } from "react";
import { skills } from "@/lib/data/skills";
import { skillIcons } from "@/lib/data/skillIcons";

// Layout space is 1000 x 660; positions are converted to percentages so it scales.
const W = 1000;
const H = 660;
const HUBS: Record<string, { x: number; y: number; color: string }> = {
  Languages: { x: 250, y: 170, color: "#a78bfa" },
  Frameworks: { x: 750, y: 170, color: "#38bdf8" },
  Databases: { x: 250, y: 490, color: "#34d399" },
  Tools: { x: 750, y: 490, color: "#fbbf24" },
};
const RING = 115;

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

interface Star {
  name: string;
  group: string;
  x: number;
  y: number;
}

function layout(): Star[] {
  const stars: Star[] = [];
  for (const [group, list] of Object.entries(skills)) {
    const hub = HUBS[group];
    if (!hub) continue;
    list.forEach((name, i) => {
      const angle = -Math.PI / 2 + (i / list.length) * Math.PI * 2;
      stars.push({ name, group, x: hub.x + Math.cos(angle) * RING, y: hub.y + Math.sin(angle) * RING });
    });
  }
  return stars;
}

const stars = layout();
const hubKeys = Object.keys(HUBS);

/** Skills drawn as connected constellations. Decorative enhancement: the list view stays the default. */
export default function SkillsConstellation() {
  const [active, setActive] = useState<string | null>(null);
  const activeGroup = stars.find((s) => s.name === active)?.group ?? null;

  return (
    <div
      className="relative mx-auto w-full max-w-5xl"
      style={{ aspectRatio: `${W} / ${H}` }}
      onMouseLeave={() => setActive(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        {/* faint links between category hubs */}
        {hubKeys.map((a, i) =>
          hubKeys.slice(i + 1).map((b) => (
            <line
              key={`${a}-${b}`}
              x1={HUBS[a].x}
              y1={HUBS[a].y}
              x2={HUBS[b].x}
              y2={HUBS[b].y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="4 6"
            />
          ))
        )}
        {stars.map((s) => {
          const hub = HUBS[s.group];
          const lit = active === s.name;
          const dim = active && !lit;
          return (
            <line
              key={s.name}
              x1={hub.x}
              y1={hub.y}
              x2={s.x}
              y2={s.y}
              stroke={hub.color}
              strokeWidth={lit ? 2.5 : 1.2}
              strokeOpacity={lit ? 0.95 : dim ? 0.12 : 0.4}
              style={{ transition: "all 200ms" }}
            />
          );
        })}
        {hubKeys.map((g) => (
          <g key={g}>
            <circle cx={HUBS[g].x} cy={HUBS[g].y} r={activeGroup === g ? 38 : 32} fill={HUBS[g].color} fillOpacity={0.2} stroke={HUBS[g].color} />
            <text
              x={HUBS[g].x}
              y={HUBS[g].y + 5}
              textAnchor="middle"
              fontSize={14}
              fontWeight={600}
              fill="currentColor"
            >
              {g}
            </text>
          </g>
        ))}
      </svg>

      {stars.map((s) => {
        const icon = skillIcons[s.name];
        const lit = active === s.name;
        return (
          <button
            key={s.name}
            type="button"
            onMouseEnter={() => setActive(s.name)}
            onFocus={() => setActive(s.name)}
            onBlur={() => setActive(null)}
            aria-label={`${s.name}, ${s.group}`}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500"
            style={{ left: pct(s.x, W), top: pct(s.y, H) }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full border bg-white shadow-md transition-transform duration-200 md:h-14 md:w-14 dark:bg-neutral-800"
              style={{
                borderColor: HUBS[s.group].color,
                transform: lit ? "scale(1.2)" : undefined,
              }}
            >
              {icon && <Image src={icon} alt="" width={32} height={32} className="h-6 w-6 object-contain md:h-8 md:w-8" />}
            </span>
            <span className="text-[10px] font-medium md:text-xs">{s.name}</span>
          </button>
        );
      })}
    </div>
  );
}
