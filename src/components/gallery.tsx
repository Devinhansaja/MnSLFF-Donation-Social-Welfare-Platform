"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/format";

type Item = { url: string; caption: string; stage: string; kind: string };

const STAGES: [string, string][] = [
  ["BEFORE", "Before the project"],
  ["VERIFICATION", "Verification visits"],
  ["DURING", "During implementation"],
  ["DISTRIBUTION", "Donation distribution"],
  ["AFTER", "After completion"],
];

export function Lightbox({ items, index, onClose, onIndex }: { items: Item[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const prev = useCallback(() => onIndex((index - 1 + items.length) % items.length), [index, items.length, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % items.length), [index, items.length, onIndex]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);
  const it = items[index];
  return (
    <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close" onClick={onClose}><X /></button>
      {items.length > 1 && (
        <>
          <button className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); prev(); }}><ChevronLeft /></button>
          <button className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); next(); }}><ChevronRight /></button>
        </>
      )}
      <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={it.url} alt={it.caption} className="max-h-[82vh] w-auto rounded-lg object-contain" />
        <figcaption className="mt-3 text-center text-sm text-white/80">{it.caption} · {index + 1} / {items.length}</figcaption>
      </figure>
    </div>
  );
}

export function HeaderGallery({ cover, items, title }: { cover: string; items: Item[]; title: string }) {
  const all: Item[] = [{ url: cover, caption: title, stage: "COVER", kind: "IMAGE" }, ...items.filter((i) => i.url !== cover)];
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      <button type="button" onClick={() => setOpen(0)} className="group relative block w-full overflow-hidden rounded-[var(--radius-card)]" aria-label="Open photo gallery">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt={title} className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-[1.02]" />
        <span className="absolute bottom-3 right-3 rounded-full bg-navy/80 px-3 py-1 text-xs font-semibold text-white">{all.length} photos</span>
      </button>
      {all.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {all.slice(1, 6).map((it, i) => (
            <button key={it.url + i} type="button" onClick={() => setOpen(i + 1)} className="overflow-hidden rounded-lg" aria-label={`Open photo ${i + 2}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt="" loading="lazy" className="aspect-square w-full object-cover transition hover:opacity-80" />
            </button>
          ))}
        </div>
      )}
      {open !== null && <Lightbox items={all} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />}
    </div>
  );
}

export function StageGallery({ items }: { items: Item[] }) {
  const available = STAGES.filter(([s]) => items.some((i) => i.stage === s));
  const [stage, setStage] = useState(available[0]?.[0] ?? "BEFORE");
  const [open, setOpen] = useState<number | null>(null);
  const shown = items.filter((i) => i.stage === stage);
  return (
    <div>
      <div role="tablist" aria-label="Gallery stages" className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {STAGES.map(([s, label]) => {
          const count = items.filter((i) => i.stage === s).length;
          return (
            <button
              key={s}
              role="tab"
              aria-selected={stage === s}
              disabled={!count}
              onClick={() => setStage(s)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
                stage === s ? "border-forest bg-forest text-white" : "border-line bg-white text-navy hover:border-forest/40",
                !count && "cursor-not-allowed opacity-40",
              )}
            >
              {label} <span className="font-num opacity-70">({count})</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((it, i) => (
          <button key={it.url + i} type="button" onClick={() => setOpen(i)} className="group overflow-hidden rounded-xl" aria-label={`Open ${it.caption}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.url} alt={it.caption} loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />
          </button>
        ))}
      </div>
      {open !== null && <Lightbox items={shown} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />}
    </div>
  );
}
