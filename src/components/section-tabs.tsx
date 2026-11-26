"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/format";

export function SectionTabs({ tabs }: { tabs: { id: string; label: string }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  useEffect(() => {
    const els = tabs.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [tabs]);

  return (
    <nav aria-label="Project sections" className="sticky top-18 z-30 -mx-5 border-b border-line bg-ivory/95 backdrop-blur sm:mx-0">
      <ul className="scrollbar-none flex gap-1 overflow-x-auto px-5 sm:px-0">
        {tabs.map((t) => (
          <li key={t.id}>
            <a
              href={`#${t.id}`}
              aria-current={active === t.id ? "true" : undefined}
              className={cn(
                "block whitespace-nowrap border-b-2 px-3 py-3.5 text-sm font-medium transition-colors",
                active === t.id ? "border-forest text-forest" : "border-transparent text-muted hover:text-navy",
              )}
            >
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
