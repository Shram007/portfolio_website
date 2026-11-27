import { cn } from '@/lib/utils';
import React from 'react';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  ariaLabelledby?: string;
}

export default function Section({ children, className, ariaLabelledby, ...rest }: SectionProps) {
  return (
    <section
      className={cn(
        'max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20 lg:py-24',
        className
      )}
      aria-labelledby={ariaLabelledby}
      {...rest}
    >
      {children}
    </section>
  );
}
