"use client";

import React from "react";
import { Briefcase, Calculator, LayoutDashboard, MessageSquare } from "lucide-react";
import PortalShell, { type PortalNavItem } from "@/components/layout/PortalShell";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: "contractor" | "employer" | "admin";
}

export default function DashboardLayout({ children, userRole }: DashboardLayoutProps) {
  const role = userRole === "contractor" ? "contractor" : "employer";
  const navItems: PortalNavItem[] = [
    { icon: LayoutDashboard, name: "ภาพรวมระบบ", href: "/dashboard" },
    {
      icon: Briefcase,
      name: role === "contractor" ? "โครงการของฉัน" : "โครงการก่อสร้าง",
      href: "/projects",
    },
    { icon: Calculator, name: "คำนวณต้นทุน", href: "/calculator" },
    { icon: MessageSquare, name: "ข้อความ", href: "/chat" },
  ];

  return (
    <PortalShell navItems={navItems} role={role}>
      {children}
    </PortalShell>
  );
}
