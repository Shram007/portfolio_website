import * as React from "react";
import { cn } from "../../lib/utils";

type Props = React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" };
export function Badge({ className, variant = "default", ...props }: Props) {
  const base = "inline-flex items-center rounded-md border px-2.5 py-1 text-xs text-neutral-200 border-white/10 bg-white/5";
  const variants = {
    default: "",
    secondary: "",
  };
  return <span className={cn(base, variants[variant], className)} {...props} />;
}
