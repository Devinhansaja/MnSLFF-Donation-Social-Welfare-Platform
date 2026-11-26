"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1 text-muted"><Share2 className="size-3.5" aria-hidden /> Share</span>
      <a className="rounded-full border border-line px-3 py-1.5 font-semibold hover:border-forest" target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`}>Facebook</a>
      <a className="rounded-full border border-line px-3 py-1.5 font-semibold hover:border-forest" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${enc(`${title} ${url}`)}`}>WhatsApp</a>
      <a className="rounded-full border border-line px-3 py-1.5 font-semibold hover:border-forest" target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}>LinkedIn</a>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 font-semibold hover:border-forest"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />} {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
