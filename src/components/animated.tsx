"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

export function ProgressBar({ percent, className, tall }: { percent: number; className?: string; tall?: boolean }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const pct = Math.min(100, Math.max(0, percent));
  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${pct}% funded`}
      className={cn("w-full overflow-hidden rounded-full bg-forest-100", tall ? "h-3" : "h-2", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-[1400ms] ease-out", pct >= 100 ? "bg-success" : "bg-forest")}
        style={{ width: seen ? `${pct}%` : "0%" }}
      />
    </div>
  );
}

export function Counter({ value, format = "number", className }: { value: number; format?: "number" | "usd"; className?: string }) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!seen) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    const dur = 1600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value]);
  const text =
    format === "usd"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(shown / 100)
      : new Intl.NumberFormat("en-US").format(Math.round(shown));
  return (
    <span ref={ref} className={cn("font-num", className)}>
      {text}
    </span>
  );
}

export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("transition-all duration-700 ease-out", seen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
