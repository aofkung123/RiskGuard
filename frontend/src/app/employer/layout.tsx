"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { Activity, BarChart2, Home, MessageSquare, Search, User } from "lucide-react";
import PortalShell, { type PortalNavItem } from "@/components/layout/PortalShell";
import { useRouter } from "next/navigation";

const navItems: PortalNavItem[] = [
  { name: "หน้าหลัก", href: "/dashboard", icon: Home },
  { name: "Dashboard วิเคราะห์", href: "/employer/dashboard", icon: BarChart2 },
  { name: "ค้นหาผู้รับเหมา", href: "/employer/search", icon: Search },
  { name: "สนทนาและส่งไฟล์", href: "/employer/chat", icon: MessageSquare },
  { name: "ติดตามสถานะโครงการ", href: "/employer/tracking", icon: Activity },
  { name: "โปรไฟล์ของฉัน", href: "/employer/profile", icon: User },
];

function hasEmployerSession() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("token") !== null && window.localStorage.getItem("role") === "employer";
}

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const authorized = mounted && hasEmployerSession();

  useEffect(() => {
    if (mounted && !authorized) {
      router.replace("/login");
    }
  }, [authorized, mounted, router]);

  if (!mounted || !authorized) return null;

  return (
    <PortalShell navItems={navItems} role="employer">
      {children}
    </PortalShell>
  );
}
