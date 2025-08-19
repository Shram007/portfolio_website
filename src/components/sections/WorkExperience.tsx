"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, MapPin, Building2, ExternalLink } from "lucide-react";

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

interface WorkExperienceProps {
  experiences: WorkExperienceItem[];
  showTechnologies?: boolean;
  showAchievements?: boolean;
  compact?: boolean;
}

const fmt = (isoYYYYMM?: string) => {
  if (!isoYYYYMM) return "";
  const [y, m] = isoYYYYMM.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("en-US", { year: "numeric", month: "short" });
};

const duration = (startDate: string, endDate: string | undefined, current: boolean) => {
  const start = new Date(startDate + "-01");
  const end = current ? new Date() : new Date((endDate ?? startDate) + "-01");
  const months = Math.max(1, Math.round((+end - +start) / (1000 * 60 * 60 * 24 * 30)));
  if (months < 12) return `${months} month${months > 1 ? "s" : ""}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem ? `${years} yr ${rem} mo` : `${years} yr${years > 1 ? "s" : ""}`;
};

const WorkExperience: React.FC<WorkExperienceProps> = ({
  experiences,
  showTechnologies = true,
  showAchievements = true,
  compact = false,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Work Experience</h2>
        <p className="text-neutral-600 dark:text-neutral-400">My professional journey and key accomplishments</p>
      </div>

      <div className="space-y-6">
        {experiences.map((xp, index) => (
          <Card key={xp.id} className="relative overflow-hidden border border-neutral-200/60 dark:border-neutral-800/60 bg-card">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 via-blue-500 to-cyan-400" />

            <CardHeader className="pb-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-500" />
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      {xp.company}
                      {xp.companyUrl && (
                        <a href={xp.companyUrl} target="_blank" rel="noreferrer" aria-label={`${xp.company} website`}>
                          <ExternalLink className="h-4 w-4 text-neutral-500 hover:text-purple-500 transition" />
                        </a>
                      )}
                    </h3>
                  </div>
                  <h4 className="text-lg font-medium text-purple-500">{xp.position}</h4>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      <span>
                        {fmt(xp.startDate)} – {xp.current ? "Present" : fmt(xp.endDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{xp.location}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start lg:items-end gap-2">
                  {xp.current && <Badge className="bg-green-100 text-green-800 border-green-200">Current</Badge>}
                  <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    {duration(xp.startDate, xp.endDate, xp.current)}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="leading-relaxed">{xp.description}</p>

              {showAchievements && xp.achievements.length > 0 && !compact && (
                <div className="space-y-2">
                  <h5 className="font-medium">Key Achievements</h5>
                  <ul className="space-y-1">
                    {xp.achievements.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <span className="text-purple-500 mt-1.5 text-xs">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showTechnologies && xp.technologies.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium">Technologies</h5>
                  <div className="flex flex-wrap gap-2">
                    {xp.technologies.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {index < experiences.length - 1 && (
                <div className="pt-4">
                  <Separator />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WorkExperience;

