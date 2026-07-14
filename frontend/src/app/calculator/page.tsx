"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ConstructionCalculator from '@/components/calculator/ConstructionCalculator';

type CalculatorRole = 'employer' | 'contractor';

function getCalculatorSession(): { ready: boolean; role: CalculatorRole } {
  if (typeof window === 'undefined') return { ready: false, role: 'employer' };
  const token = window.localStorage.getItem("token");
  const role = window.localStorage.getItem("role");
  if (!token || (role !== "employer" && role !== "contractor")) return { ready: false, role: 'employer' };
  return { ready: true, role };
}

export default function CalculatorPage() {
  const router = useRouter();
  const [session] = useState(getCalculatorSession);

  useEffect(() => {
    if (!session.ready) {
      router.replace("/login");
    }
  }, [router, session.ready]);

  if (!session.ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <DashboardLayout userRole={session.role}>
      <ConstructionCalculator />
    </DashboardLayout>
  );
}
