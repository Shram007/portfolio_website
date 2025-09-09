"use client";

import React from "react";
import { GraduationCap, Calendar, MapPin, Award, BookOpen } from "lucide-react";
import { educationData, Education } from "@/lib/data/education";

export default function EducationSection() {
  return (
    <section aria-labelledby="education-title" className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header */}

      {/* Education Cards */}
      <div className="space-y-8">
        {educationData.map((edu, index) => (
          <div
            key={edu.id}
            className="relative bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 hover:shadow-lg transition-shadow duration-300"
          >
            {/* Status Badge */}
            <div className="absolute top-6 right-6">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  edu.status === "in-progress"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                }`}
              >
                {edu.status === "in-progress" ? "In Progress" : "Completed"}
              </span>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {edu.degree}
                  </h3>
                  <p className="text-lg text-neutral-700 dark:text-neutral-300 mt-1">
                    {edu.field}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span className="font-medium">{edu.school}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{edu.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{edu.startMonth} {edu.startYear} - {edu.endMonth} {edu.endYear}</span>
                    </div>
                    {edu.gpa && (
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        <span>GPA: {edu.gpa}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {edu.description && (
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {edu.description}
                </p>
              )}

              {/* Two Column Layout */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Achievements */}
                {edu.achievements && edu.achievements.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                      Achievements
                    </h4>
                    <ul className="space-y-2">
                      {edu.achievements.map((achievement, achievementIndex) => (
                        <li
                          key={achievementIndex}
                          className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400"
                        >
                          <span className="text-green-500 mt-1">•</span>
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Relevant Coursework */}
                {edu.coursework && edu.coursework.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                      Relevant Coursework
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {edu.coursework.map((course, courseIndex) => (
                        <span
                          key={courseIndex}
                          className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-md text-sm"
                        >
                          {course}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}