import React from "react";
import { cn } from "@/lib/utils";

interface StardustButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

/** Glossy pill button. Its hover and press styles live in globals.css under .pearl-button. */
export const StardustButton = ({
  children = "Launching Soon",
  className,
  type = "button",
  ...props
}: StardustButtonProps) => (
  <button
    type={type}
    className={cn(
      "pearl-button focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500",
      className
    )}
    {...props}
  >
    <span className="pearl-wrap">
      <span className="pearl-label">
        <span aria-hidden="true">✧</span>
        <span aria-hidden="true">✦</span>
        {children}
      </span>
    </span>
  </button>
);
