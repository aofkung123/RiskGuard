"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Briefcase,
  Home,
  MessageSquare,
  User,
} from "lucide-react";
import PortalShell, { type PortalNavItem } from "@/components/layout/PortalShell";
import { useRouter } from "next/navigation";

const navItems: PortalNavItem[] = [
  { name: "หน้าหลัก", href: "/dashboard", icon: Home },
  { name: "Dashboard วิเคราะห์", href: "/contractor/dashboard", icon: BarChart2 },
  { name: "การแจ้งเตือน", href: "/contractor/warnings", icon: AlertTriangle },
  { name: "บริการและผลงาน", href: "/contractor/services", icon: Briefcase },
  { name: "สนทนากับผู้ว่าจ้าง", href: "/contractor/chat", icon: MessageSquare },
  { name: "อัปเดตสถานะงาน", href: "/contractor/tracking", icon: Activity },
  { name: "โปรไฟล์ของฉัน", href: "/contractor/profile", icon: User },
];

function hasContractorSession() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("token") !== null && window.localStorage.getItem("role") === "contractor";
}

export default function ContractorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const authorized = mounted && hasContractorSession();

  useEffect(() => {
    if (mounted && !authorized) {
      router.replace("/login");
    }
  }, [authorized, mounted, router]);

  if (!mounted || !authorized) return null;

  return (
    <PortalShell navItems={navItems} role="contractor">
      {children}
    </PortalShell>
  );
}
