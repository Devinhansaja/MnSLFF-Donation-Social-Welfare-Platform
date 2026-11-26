"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/format";

export function HeroSlideshow({ images }: { images: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % images.length), 6500);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <div className="absolute inset-0 -z-10" aria-hidden>
      {images.map((src, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          fetchPriority={idx === 0 ? "high" : "low"}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-all duration-[2000ms] ease-out",
            idx === i ? "scale-105 opacity-100" : "scale-100 opacity-0",
          )}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b2a20]/90 via-[#0b2a20]/65 to-[#0b2a20]/25" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0b2a20]/70 to-transparent" />
      {images.length > 1 && (
        <div className="absolute bottom-8 right-8 hidden gap-2 md:flex">
          {images.map((src, idx) => (
            <span key={src} className={cn("h-1 rounded-full transition-all duration-500", idx === i ? "w-8 bg-gold" : "w-3 bg-white/40")} />
          ))}
        </div>
      )}
    </div>
  );
}
