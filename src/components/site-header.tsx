"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Globe, Heart, Menu, UserRound, X } from "lucide-react";
import { cn } from "@/lib/format";
import { setLanguage } from "@/app/actions/lang";

type NavItem = { href: string; label: string };

export function SiteHeader({
  nav, lang, labels, signedIn,
}: { nav: NavItem[]; lang: string; labels: { donate: string; login: string }; signedIn: { name: string; href: string } | null }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const onHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu when the route changes (state adjustment during render).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const transparent = onHome && !scrolled && !open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        transparent ? "bg-transparent" : "border-b border-line/80 bg-ivory/95 shadow-sm backdrop-blur-md",
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="mx-auto flex h-18 max-w-[90rem] items-center gap-4 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="MnSLFF home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={transparent ? "/brand/mark-white.png" : "/brand/mark.png"} alt="" className="h-10 w-auto" />
          <span className={cn("hidden leading-tight sm:block", transparent ? "text-white" : "text-navy")}>
            <span className="block font-serif text-[1.05rem] font-semibold">Minnesota Sri Lanka</span>
            <span className={cn("block text-[0.72rem] tracking-wide", transparent ? "text-white/75" : "text-muted")}>Friendship Foundation</span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden 2xl:block">
          <ul className="flex items-center gap-0.5">
            {nav.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href.split("?")[0]);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={cn(
                      "whitespace-nowrap rounded-full px-2 py-2 text-[0.8rem] font-medium transition-colors",
                      transparent ? "text-white/90 hover:bg-white/10 hover:text-white" : "text-navy/80 hover:bg-forest-50 hover:text-forest",
                      active && (transparent ? "text-white" : "text-forest"),
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 2xl:ml-2">
          <form action={setLanguage} className="relative">
            <label className="sr-only" htmlFor="lang-select">Language</label>
            <Globe className={cn("pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2", transparent ? "text-white" : "text-muted")} aria-hidden />
            <select
              id="lang-select"
              name="lang"
              defaultValue={lang}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className={cn(
                "h-9 cursor-pointer appearance-none rounded-full border bg-transparent pl-8 pr-3 text-xs font-semibold",
                transparent ? "border-white/40 text-white [&>option]:text-navy" : "border-line text-navy",
              )}
            >
              <option value="en">EN</option>
              <option value="si">සිං</option>
              <option value="ta">தமி</option>
            </select>
          </form>
          <Link
            href={signedIn ? signedIn.href : "/login"}
            className={cn(
              "hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold sm:inline-flex",
              transparent ? "text-white hover:bg-white/10" : "text-navy hover:bg-forest-50",
            )}
          >
            <UserRound className="size-4" aria-hidden />
            {signedIn ? signedIn.name.split(" ")[0] : labels.login}
          </Link>
          <Link
            href="/donate"
            className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-gold px-4 text-sm font-semibold text-forest-deep shadow-sm transition hover:brightness-95"
          >
            <Heart className="size-4 fill-current" aria-hidden /> {labels.donate}
          </Link>
          <button
            type="button"
            className={cn("inline-flex size-10 items-center justify-center rounded-full 2xl:hidden", transparent ? "text-white" : "text-navy")}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-line bg-ivory 2xl:hidden">
          <ul className="mx-auto grid max-w-7xl gap-1 px-5 py-4 sm:grid-cols-2">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="block rounded-xl px-4 py-3 font-medium text-navy hover:bg-forest-50">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={signedIn ? signedIn.href : "/login"} className="block rounded-xl px-4 py-3 font-medium text-forest hover:bg-forest-50">
                {signedIn ? `My account (${signedIn.name})` : labels.login}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
