import { cn } from '../../lib/utils';
import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  titleId?: string;
}

export default function SectionHeader({ title, subtitle, className, titleId }: SectionHeaderProps) {
  return (
    <div className={cn('mb-8 md:mb-10 text-center', className)}>
      <h2 id={titleId} className="mb-4 text-3xl md:text-4xl font-semibold">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base md:text-lg text-neutral-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
