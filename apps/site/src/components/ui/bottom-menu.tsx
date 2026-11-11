"use client";

import * as React from "react";
import NextLink from "next/link";
import { cn } from "@/lib/utils";

export interface MenuBarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface MenuBarProps {
  items: MenuBarItem[];
  activeHref: string;
  /** Home URL of the current locale (`/` or `/en`): only active on an exact match. */
  homeHref?: string;
}

// Same look as the admin app's framer-motion version, done with CSS transitions so the
// public site does not ship framer-motion.
export function MenuBar({ items, activeHref, homeHref = "/" }: MenuBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-background/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          {items.map((item, index) => {
            const isActive = activeHref === item.href ||
              (item.href !== homeHref && !item.href.includes("#") && activeHref.startsWith(item.href));
            return (
              <NextLink
                key={index}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors duration-200 min-w-[48px]",
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "relative w-6 h-6 flex items-center justify-center transition-transform duration-200",
                    isActive && "scale-110",
                  )}
                >
                  {item.icon}
                </div>
                <span
                  className={cn(
                    "relative text-[10px] font-medium leading-none transition-all duration-200",
                    isActive ? "opacity-100" : "opacity-60",
                  )}
                >
                  {item.label}
                </span>
              </NextLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
