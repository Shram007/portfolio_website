import * as React from "react";
import { cn } from "../../lib/utils";

type Props = React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" };
export function Badge({ className, variant = "default", ...props }: Props) {
  const base = "inline-flex items-center rounded-md border px-2.5 py-1 text-xs";
  const variants = {
    default: "text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5",
    secondary: "text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5",
  };
  return <span className={cn(base, variants[variant], className)} {...props} />;
}
