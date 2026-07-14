"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import { clearSession, type UserRole } from "@/lib/api";
import { applyTheme, getInitialTheme, persistTheme, type AppTheme } from "@/lib/theme";

export interface PortalNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface PortalShellProps {
  children: React.ReactNode;
  navItems: PortalNavItem[];
  role: Extract<UserRole, "employer" | "contractor">;
}

const ROLE_CONFIG = {
  employer: {
    title: "Employer Workspace",
    label: "ผู้ว่าจ้าง",
    accentText: "text-teal-700 dark:text-teal-300",
    accentBg: "bg-teal-700",
    logoIcon: "text-white",
    active: "bg-teal-50 text-teal-900 dark:bg-teal-400/10 dark:text-teal-200",
    activeIcon: "bg-teal-700 text-white dark:bg-teal-400 dark:text-slate-950",
  },
  contractor: {
    title: "Contractor Workspace",
    label: "ผู้รับเหมา",
    accentText: "text-indigo-700 dark:text-indigo-300",
    accentBg: "bg-indigo-600",
    logoIcon: "text-white",
    active: "bg-indigo-50 text-indigo-900 dark:bg-indigo-400/10 dark:text-indigo-200",
    activeIcon: "bg-indigo-600 text-white dark:bg-indigo-400 dark:text-slate-950",
  },
} as const;

export default function PortalShell({ children, navItems, role }: PortalShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);
  const config = ROLE_CONFIG[role];

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    persistTheme(next);
  };

  const logout = () => {
    clearSession();
    setMobileOpen(false);
  };

  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  const activeItem = [...navItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isActive(item.href));

  const sidebar = (compact: boolean) => (
    <aside className={`flex h-full flex-col border-r border-border bg-card/95 transition-[width] duration-200 dark:bg-card ${compact ? "w-20" : "w-64"}`}>
      <div className="flex h-16 items-center border-b border-border/70 px-4">
        <Link href="/dashboard" className={`flex min-w-0 items-center ${compact ? "justify-center" : "gap-3"}`}>
          <div className={`${config.accentBg} flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm shadow-slate-900/10`}>
            <Shield className={`h-5 w-5 ${config.logoIcon}`} />
          </div>
          {!compact && (
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold text-foreground">RiskGuard</p>
              <p className={`truncate text-[11px] font-semibold ${config.accentText}`}>{config.title}</p>
            </div>
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        {!compact && <p className="mb-2 px-3 text-[11px] font-bold uppercase text-slate-400">Workspace</p>}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={compact ? item.name : undefined}
                className={`group flex h-11 items-center rounded-lg text-sm font-semibold transition-colors ${
                  compact ? "justify-center px-2" : "gap-3 px-2.5"
                } ${
                  active
                    ? config.active
                    : "text-slate-600 hover:bg-stone-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white"
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${active ? config.activeIcon : "group-hover:bg-white dark:group-hover:bg-slate-700"}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {!compact && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border p-3">
        {!compact && (
          <div className="mb-2 flex items-center gap-3 rounded-lg border border-border/50 bg-stone-50 px-3 py-2.5 dark:bg-slate-900/40">
            <div className={`h-2.5 w-2.5 rounded-full ${config.accentBg}`} />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">{config.label}</p>
              <p className="truncate text-[11px] text-slate-500">บัญชีที่กำลังใช้งาน</p>
            </div>
          </div>
        )}
        <Link
          href="/login"
          onClick={logout}
          title={compact ? "ออกจากระบบ" : undefined}
          className={`flex h-10 items-center rounded-lg text-sm font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 ${compact ? "justify-center" : "gap-3 px-3"}`}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!compact && <span>ออกจากระบบ</span>}
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/70 bg-card/90 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className={`${config.accentBg} flex h-9 w-9 items-center justify-center rounded-lg`}>
            <Shield className={`h-5 w-5 ${config.logoIcon}`} />
          </div>
          <div>
            <p className="font-bold text-foreground">RiskGuard</p>
            <p className={`text-[11px] font-semibold ${config.accentText}`}>{activeItem?.name || config.label}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-stone-100 dark:hover:bg-slate-800" aria-label="เปลี่ยนธีม">
            {theme === "dark" ? <Sun className="h-[18px] w-[18px] text-teal-300" /> : <Moon className="h-[18px] w-[18px] text-slate-600" />}
          </button>
          <button type="button" onClick={() => setMobileOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-stone-100 dark:hover:bg-slate-800" aria-label="เปิดเมนู">
            <Menu className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      <div className="flex min-h-screen">
        <div className="hidden lg:sticky lg:top-0 lg:block lg:h-screen">{sidebar(collapsed)}</div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="ปิดเมนู" />
            <div className="relative h-full w-64 shadow-2xl shadow-black/30">
              <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-stone-100 dark:hover:bg-slate-800" aria-label="ปิดเมนู">
                <X className="h-[18px] w-[18px]" />
              </button>
              {sidebar(false)}
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-border/70 bg-card/85 px-5 backdrop-blur lg:flex">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-stone-100 hover:text-foreground dark:hover:bg-slate-800"
                title={collapsed ? "ขยายแถบเมนู" : "ยุบแถบเมนู"}
                aria-label={collapsed ? "ขยายแถบเมนู" : "ยุบแถบเมนู"}
              >
                {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{activeItem?.name || config.label}</p>
                <p className="truncate text-xs text-slate-500">{config.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold dark:bg-slate-900 ${config.accentText}`}>{config.label}</span>
              <button type="button" onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-stone-100 dark:hover:bg-slate-800" title={theme === "dark" ? "ใช้โหมดสว่าง" : "ใช้โหมดมืด"} aria-label="เปลี่ยนธีม">
                {theme === "dark" ? <Sun className="h-[18px] w-[18px] text-teal-300" /> : <Moon className="h-[18px] w-[18px] text-slate-600" />}
              </button>
            </div>
          </header>

          <main className="overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
