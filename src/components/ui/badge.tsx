import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" };
export function Badge({ className, variant = "default", ...props }: Props) {
  const base = "inline-flex items-center rounded-md border px-2 py-1 text-xs";
  const variants = {
    default: "border-neutral-200 bg-neutral-100 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100",
    secondary: "border-neutral-200 bg-transparent text-neutral-700 dark:border-neutral-700 dark:text-neutral-300",
  };
  return <span className={cn(base, variants[variant], className)} {...props} />;
}
