"use client";

import Link from "next/link";
import {
  HomeIcon, Package, Component, Activity, ScrollText, Mail,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
//import { ThemeToggle } from "@/components/ui/theme-toggle";

const items = [
  { title: "Home",       href: "#home",      icon: <HomeIcon className="h-full w-full" /> },
  { title: "Projects",   href: "#projects",  icon: <Package className="h-full w-full" /> },
  { title: "Experience", href: "#experience",icon: <Activity className="h-full w-full" /> },
  { title: "Education",  href: "#education", icon: <ScrollText className="h-full w-full" /> },
  { title: "Skills",     href: "#skills",    icon: <Component className="h-full w-full" /> },
  { title: "Contact",    href: "#contact",   icon: <Mail className="h-full w-full" /> },
  //{ title: "Theme",      href: "#",          icon: <SunMoon className="h-full w-full" /> }, // (we’ll wire a real toggle later)
];

export function AppleStyleDock() {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="pointer-events-none fixed inset-y-0 right-4 z-50 flex items-center">
      <div className="flex items-center">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="pointer-events-auto h-8 w-8 flex items-center justify-center rounded-full bg-background/30 backdrop-blur-sm hover:bg-background/40 transition-colors"
          aria-label={isCollapsed ? "Expand dock" : "Collapse dock"}
        >
          {isCollapsed ? <ChevronLeft className="h-40 w-40" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="ml-2"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
