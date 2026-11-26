"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Bell, ChevronsLeft, ChevronsRight, LayoutDashboard, FolderKanban, Users, HandCoins, UserRound, Landmark,
  PanelsTopLeft, Settings, Menu, Moon, Sun, LogOut, X, CheckCircle2, AlertTriangle, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/format";
import { logout } from "@/app/actions/auth";

export type NavGroup = { title: string; icon: string; items: { href: string; label: string }[] };

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard, projects: FolderKanban, beneficiaries: Users, donations: HandCoins,
  donors: UserRound, finance: Landmark, cms: PanelsTopLeft, admin: Settings,
};

export function AdminShell({
  groups, user, unread, demo, children,
}: { groups: NavGroup[]; user: { name: string; role: string }; unread: number; demo: boolean; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(localStorage.getItem("admin-theme") === "dark");
    setCollapsed(localStorage.getItem("admin-collapsed") === "1");
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMobile(false), [pathname]);

  const toggleDark = () => {
    setDark((d) => {
      localStorage.setItem("admin-theme", d ? "light" : "dark");
      return !d;
    });
  };
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("admin-collapsed", c ? "0" : "1");
      return !c;
    });
  };

  const sidebar = (isMobile: boolean) => (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark-white.png" alt="" className="h-8 w-auto" />
        {(!collapsed || isMobile) && (
          <div className="leading-tight">
            <p className="font-serif text-sm text-white">MnSLFF Admin</p>
            <p className="text-[11px] text-white/60">Management console</p>
          </div>
        )}
        {isMobile && (
          <button className="ml-auto text-white" onClick={() => setMobile(false)} aria-label="Close menu"><X /></button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3 scrollbar-none">
        {groups.map((g) => {
          const Icon = ICONS[g.icon] ?? LayoutDashboard;
          return (
            <div key={g.title} className="mb-3">
              {collapsed && !isMobile ? (
                <Link href={g.items[0].href} title={g.title} className="flex justify-center rounded-lg p-2.5 text-white/70 hover:bg-white/10 hover:text-white">
                  <Icon className="size-5" />
                </Link>
              ) : (
                <>
                  <p className="flex items-center gap-2 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gold/90">
                    <Icon className="size-3.5" /> {g.title}
                  </p>
                  <ul>
                    {g.items.map((it) => {
                      const base = it.href.split("?")[0].split("#")[0];
                      const active = it.href === "/admin" ? pathname === "/admin" : pathname === base && !it.href.includes("?");
                      return (
                        <li key={it.href + it.label}>
                          <Link
                            href={it.href}
                            className={cn(
                              "block rounded-lg px-3 py-1.5 text-[13px] text-white/75 hover:bg-white/10 hover:text-white",
                              active && "bg-white/12 font-semibold text-white",
                            )}
                          >
                            {it.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>
      {!isMobile && (
        <button onClick={toggleCollapsed} className="flex items-center justify-center gap-2 border-t border-white/10 py-3 text-xs text-white/60 hover:text-white" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" /> Collapse</>}
        </button>
      )}
    </nav>
  );

  return (
    <div className={cn(dark && "dark")}>
      <div className="min-h-dvh bg-[#f4f3ee] text-navy dark:bg-[#0b1720] dark:text-slate-200">
        <aside className={cn("fixed inset-y-0 left-0 z-40 hidden bg-forest-deep transition-[width] duration-200 lg:block", collapsed ? "w-16" : "w-64")}>
          {sidebar(false)}
        </aside>
        {mobile && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobile(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 bg-forest-deep">{sidebar(true)}</aside>
          </div>
        )}
        <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-16" : "lg:pl-64")}>
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur dark:border-[#24384a] dark:bg-[#0f1d27]/90 sm:px-6">
            <button className="lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu"><Menu /></button>
            <form action="/admin/search" className="hidden max-w-sm flex-1 md:block">
              <label htmlFor="admin-q" className="sr-only">Search</label>
              <input id="admin-q" name="q" placeholder="Search projects, donations, donors…" className="field h-9 !py-1.5 text-sm" />
            </form>
            <div className="ml-auto flex items-center gap-1.5">
              <Link href="/" target="_blank" className="hidden items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:bg-forest-50 sm:inline-flex dark:hover:bg-white/5">
                View site <ExternalLink className="size-3.5" />
              </Link>
              <button onClick={toggleDark} className="rounded-full p-2 text-muted hover:bg-forest-50 dark:hover:bg-white/5" aria-label="Toggle dark mode">
                {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
              </button>
              <Link href="/admin/notifications" className="relative rounded-full p-2 text-muted hover:bg-forest-50 dark:hover:bg-white/5" aria-label={`Notifications (${unread} unread)`}>
                <Bell className="size-4.5" />
                {unread > 0 && <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-urgent px-1 text-center text-[10px] font-bold text-white">{unread}</span>}
              </Link>
              <div className="ml-1 hidden text-right leading-tight sm:block">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-[11px] text-muted">{user.role}</p>
              </div>
              <form action={logout}>
                <button className="rounded-full p-2 text-muted hover:bg-forest-50 dark:hover:bg-white/5" aria-label="Sign out" title="Sign out">
                  <LogOut className="size-4.5" />
                </button>
              </form>
            </div>
          </header>
          {demo && (
            <div className="border-b border-dashed border-gold bg-gold-soft px-6 py-2 text-xs font-semibold text-forest-deep">
              Demo data present — projects, donors, donations and impact figures marked “demo” are fictional and must not be published as real achievements.
            </div>
          )}
          <Suspense>
            <Flash />
          </Suspense>
          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

function Flash() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ok = sp.get("ok");
  const err = sp.get("err");
  const [shown, setShown] = useState<{ ok: boolean; msg: string } | null>(null);
  useEffect(() => {
    if (!ok && !err) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown({ ok: !!ok, msg: (ok ?? err) as string });
    const params = new URLSearchParams(sp.toString());
    params.delete("ok");
    params.delete("err");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    const t = setTimeout(() => setShown(null), 6000);
    return () => clearTimeout(t);
  }, [ok, err, sp, router, pathname]);
  if (!shown) return null;
  return (
    <div role={shown.ok ? "status" : "alert"} className="fixed bottom-5 right-5 z-[60] max-w-sm animate-fade-up">
      <div className={cn("flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg", shown.ok ? "bg-forest text-white" : "bg-urgent text-white")}>
        {shown.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
        <span>{shown.msg}</span>
        <button onClick={() => setShown(null)} aria-label="Dismiss" className="ml-2 opacity-70 hover:opacity-100"><X className="size-4" /></button>
      </div>
    </div>
  );
}
