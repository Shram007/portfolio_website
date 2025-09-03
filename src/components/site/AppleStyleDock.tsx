"use client";

import Link from "next/link";
import {
  HomeIcon, Package, Component, Activity, ScrollText, Mail, SunMoon,
} from "lucide-react";
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";
//import { ThemeToggle } from "@/components/ui/theme-toggle";

const items = [
  { title: "Home",       href: "#home",      icon: <HomeIcon className="h-full w-full" /> },
  { title: "Experience", href: "#experience",icon: <Activity className="h-full w-full" /> },
  { title: "Projects",   href: "#projects",  icon: <Package className="h-full w-full" /> },
  { title: "Education",  href: "#education", icon: <ScrollText className="h-full w-full" /> },
  { title: "Skills",     href: "#skills",    icon: <Component className="h-full w-full" /> },
  { title: "Contact",    href: "#contact",   icon: <Mail className="h-full w-full" /> },
  //{ title: "Theme",      href: "#",          icon: <SunMoon className="h-full w-full" /> }, // (we’ll wire a real toggle later)
];

export function AppleStyleDock() {
  return (
    <div className="pointer-events-none fixed inset-y-0 right-4 z-50 flex items-center">
      <Dock 
        className="pointer-events-auto bg-background/30 backdrop-blur-sm" 
        orientation="vertical"
        magnification={40}
        distance={10}
      >
        {items.map((item) => (
          <DockItem
            key={item.title}
            className="aspect-square w-10 h-10 rounded-full bg-gray-200/10 dark:bg-neutral-800/50 hover:bg-gray-200/20 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <DockLabel>{item.title}</DockLabel>
            <DockIcon>
              <Link
                href={item.href}
                className="block h-full w-full text-neutral-700 dark:text-neutral-300"
                aria-label={item.title}
              >
                {item.icon}
              </Link>
            </DockIcon>
          </DockItem>
        ))}
      </Dock>
    </div>
  );
}
