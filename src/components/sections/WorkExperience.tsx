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

const WorkExperience: React.FC<WorkExperienceProps> = ({
  experiences,
  showTechnologies = true,
  showAchievements = true,
  compact = false
}) => {
  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    const [y, m] = dateString.split("-").map(Number);
    const date = new Date(y, (m ?? 1) - 1, 1);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
  };

  const calculateDuration = (startDate: string, endDate: string | undefined, current: boolean): string => {
    const start = new Date(startDate + "-01");
    const end = current ? new Date() : new Date((endDate ?? startDate) + "-01");
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    
    if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
    }
    
    const years = Math.floor(diffMonths / 12);
    const remainingMonths = diffMonths % 12;
    
    if (remainingMonths === 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    }
    
    return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Work Experience</h2>
        <p className="text-muted-foreground">My professional journey and key accomplishments</p>
      </div>
      
      <div className="space-y-6">
        {experiences.map((experience, index) => (
          <Card key={experience.id} className="relative overflow-hidden border-border bg-card">
            {/* Timeline indicator */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
            
            <CardHeader className="pb-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                      {experience.company}
                      {experience.companyUrl && (
                        <a href={experience.companyUrl} target="_blank" rel="noreferrer" aria-label={`${experience.company} website`}>
                          <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer transition" />
                        </a>
                      )}
                    </h3>
                  </div>
                  <h4 className="text-lg font-medium text-primary">{experience.position}</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      <span>
                        {formatDate(experience.startDate)} - {experience.current ? 'Present' : formatDate(experience.endDate || '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{experience.location}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-start lg:items-end gap-2">
                  {experience.current && (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      Current
                    </Badge>
                  )}
                  <span className="text-sm font-medium text-muted-foreground">
                    {calculateDuration(experience.startDate, experience.endDate, experience.current)}
                  </span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-foreground leading-relaxed">{experience.description}</p>
              
              {showAchievements && experience.achievements.length > 0 && !compact && (
                <div className="space-y-2">
                  <h5 className="font-medium text-foreground">Key Achievements:</h5>
                  <ul className="space-y-1">
                    {experience.achievements.map((achievement, achievementIndex) => (
                      <li key={achievementIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-1.5 text-xs">•</span>
                        <span>{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {showTechnologies && experience.technologies.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium text-foreground">Technologies:</h5>
                  <div className="flex flex-wrap gap-2">
                    {experience.technologies.map((tech, techIndex) => (
                      <Badge key={techIndex} variant="secondary" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {index < experiences.length - 1 && (
                <div className="pt-4">
                  <Separator className="bg-border" />
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