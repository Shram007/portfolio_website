"use client";

import { cn } from "@/lib/utils";

interface ViewToggleProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}

/** Small segmented control. Uses aria-pressed buttons so it works with plain Tab/Enter. */
export default function ViewToggle<T extends string>({ label, value, options, onChange, className }: ViewToggleProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex rounded-full border border-neutral-500/40 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-9 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
            value === o.value
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "hover:bg-neutral-500/10"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
