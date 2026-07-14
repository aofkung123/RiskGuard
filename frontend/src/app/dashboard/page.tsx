"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Shield, BarChart3, AlertTriangle, Clock, TrendingDown,
  ChevronRight, Loader2, Activity, Package, Users,
  Wrench, FileText, ClipboardList, Search, Bell, Sun, Moon
} from 'lucide-react';
import { apiRequest, clearSession, fetchCurrentUser, getStoredRole, type UserRole } from '@/lib/api';
import { applyTheme, getInitialTheme, persistTheme, type AppTheme } from '@/lib/theme';

interface UserInfo {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
}

interface ProjectOption {
  id: number;
  title: string;
  description: string;
  budget: number;
  status: string;
  contractor_name?: string | null;
  employer_name?: string | null;
}

interface OverviewData {
  project: {
    id: number;
    title: string;
    type: string;
    status: string;
    total_budget: number;
    percent_complete: number;
    days_remaining: number;
  };
  kpis: {
    total_budget: number;
    actual_cost: number;
    percent_complete: number;
    days_remaining: number;
    cpi: number;
    spi: number;
  };
}

interface WarningData {
  overall_risk: { overall_level: string; alerts: { level: string; metric: string; value: number; message: string }[] };
  alert_log: { date: string; level: string; metric: string; value: number; message: string }[];
  risk_matrix: { risk: string; probability: number; impact: number; level: string }[];
}

interface SyncStatus {
  dw_path: string;
  last_sync: string | null;
  total_synced: number;
  categories_synced: number;
  status: string;
}

export default function DashboardHomePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [role, setRole] = useState<Extract<UserRole, 'employer' | 'contractor'>>('contractor');
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [warnings, setWarnings] = useState<WarningData | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingWarnings, setLoadingWarnings] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingSync, setLoadingSync] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);

  // Theme Sync
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    persistTheme(next);
  };

  async function fetchOverview(projectId: number) {
    setLoadingOverview(true);
    try {
      setOverview(await apiRequest<OverviewData>(`/api/dashboard/overview?project_id=${projectId}`));
      setLoadError(null);
    } catch {
      setLoadError('ไม่สามารถโหลดภาพรวมโครงการได้');
    }
    finally { setLoadingOverview(false); }
  }

  async function fetchWarnings(projectId: number) {
    setLoadingWarnings(true);
    try {
      setWarnings(await apiRequest<WarningData>(`/api/dashboard/warnings?project_id=${projectId}`));
    } catch { /* keep existing content */ }
    finally { setLoadingWarnings(false); }
  }

  async function fetchSyncStatus() {
    try {
      setSyncStatus(await apiRequest<SyncStatus>('/api/materials/sync-status'));
    } catch { /* silent */ }
  }

  useEffect(() => {
    let active = true;

    async function initDashboard() {
      const profile = await fetchCurrentUser();
      if (!active) return;

      const storedRole = getStoredRole();
      const effectiveRole = (profile?.role === 'employer' || profile?.role === 'contractor')
        ? profile.role
        : storedRole === 'employer' || storedRole === 'contractor'
          ? storedRole
          : 'contractor';

      setRole(effectiveRole);
      if (profile) {
        setUser(profile);
        localStorage.setItem('role', effectiveRole);
      }

      try {
        if (profile?.id) {
          const list = await apiRequest<ProjectOption[]>(`/api/tracking/projects?user_id=${profile.id}&role=${effectiveRole}`);
          if (!active) return;
          setProjects(list);
          setSelectedProjectId(list[0]?.id ?? null);
        } else {
          setSelectedProjectId(null);
        }
      } catch {
        if (!active) return;
        setLoadError('ไม่สามารถโหลดรายการโครงการได้');
        setSelectedProjectId(null);
      } finally {
        if (active) setLoadingProjects(false);
      }
    }

    void initDashboard();
    void Promise.resolve().then(fetchSyncStatus);

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    void Promise.resolve().then(() => {
      void fetchOverview(selectedProjectId);
      void fetchWarnings(selectedProjectId);
    });
  }, [selectedProjectId]);

  const triggerSync = async () => {
    setLoadingSync(true);
    try {
      setSyncStatus(await apiRequest<SyncStatus>('/api/materials/sync-from-dw', { method: 'POST' }));
    } catch { /* silent */ }
    finally { setLoadingSync(false); }
  };

  const isEmployer = role === 'employer';
  const accentClass = isEmployer ? 'text-white bg-teal-700' : 'text-white bg-indigo-600';
  const accentText = isEmployer ? 'text-teal-700 dark:text-teal-300' : 'text-indigo-700 dark:text-indigo-300';
  const accentBg = isEmployer ? 'bg-teal-700' : 'bg-indigo-600';
  const accentSoft = isEmployer
    ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-400/10 dark:text-teal-300 dark:border-teal-400/20'
    : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-400/10 dark:text-indigo-300 dark:border-indigo-400/20';

  const cpiVal = overview?.kpis?.cpi ?? 0;
  const spiVal = overview?.kpis?.spi ?? 0;
  
  // High contrast colors for both light & dark mode
  const cpiColor = cpiVal < 0.85 
    ? 'text-red-600 dark:text-red-400' 
    : cpiVal < 0.95 
      ? 'text-amber-600 dark:text-amber-400' 
      : 'text-emerald-600 dark:text-emerald-400';
      
  const spiColor = spiVal < 0.85 
    ? 'text-red-600 dark:text-red-400' 
    : spiVal < 0.95 
      ? 'text-amber-600 dark:text-amber-400' 
      : 'text-emerald-600 dark:text-emerald-400';

  const recentAlerts = warnings?.alert_log ?? [];
  const criticalAlerts = warnings?.overall_risk?.alerts ?? [];
  const riskLevel = warnings?.overall_risk?.overall_level ?? 'normal';

  const formatBudget = (v: number) => {
    if (v >= 1_000_000) return `฿${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `฿${(v / 1_000).toFixed(0)}K`;
    return `฿${v}`;
  };

  const levelBadge = (lvl: string) => {
    if (lvl === 'critical') return 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20';
    if (lvl === 'warning') return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20';
    return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20';
  };

  const roleLabel = isEmployer ? 'ผู้ว่าจ้าง' : 'ผู้รับเหมา';
  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  const quickActions = isEmployer ? [
    { label: 'ค้นหาผู้รับเหมา', desc: 'ค้นหาและเปรียบเทียบผู้รับเหมาที่เหมาะสมกับโครงการ', href: '/employer/search', icon: Search },
    { label: 'ติดตามสถานะโครงการ', desc: 'ดูความคืบหน้าและอนุมัติขั้นตอนงาน', href: '/employer/tracking', icon: ClipboardList },
    { label: 'จัดการใบเสนอราคา', desc: 'ตรวจสอบและอนุมัติใบเสนอราคาจากผู้รับเหมา', href: '/employer/quotations', icon: FileText },
    { label: 'สนทนากับผู้รับเหมา', desc: 'ติดต่อประสานงานและส่งไฟล์เอกสาร', href: '/employer/chat', icon: Users },
  ] : [
    { label: 'อัปเดตสถานะงาน', desc: 'รายงานความคืบหน้าโครงการและอัปโหลดรูปถ่าย', href: '/contractor/tracking', icon: Activity },
    { label: 'บริการและผลงาน', desc: 'จัดการโปรไฟล์บริการและแสดงผลงาน', href: '/contractor/services', icon: Wrench },
    { label: 'ส่งใบเสนอราคา', desc: 'จัดทำและส่งใบเสนอราคาให้ผู้ว่าจ้าง', href: '/contractor/chat', icon: FileText },
    { label: 'สนทนากับผู้ว่าจ้าง', desc: 'ติดต่อประสานงานกับผู้ว่าจ้างโครงการ', href: '/contractor/chat', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        {/* ── Header ────────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className={`${accentClass} p-2.5 rounded-xl`}>
              <Shield className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">RiskGuard</h1>
              <p className="text-xs text-slate-500 font-medium">
                {isEmployer ? 'Employer Portal' : 'Contractor Portal'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme toggle switcher */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-border bg-card hover:bg-stone-100 dark:hover:bg-slate-800 text-foreground transition-all cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-teal-300" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            
            <Link
              href="/login"
              onClick={clearSession}
              className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors flex items-center gap-2"
            >
              ออกจากระบบ
            </Link>
          </div>
        </div>

        {/* ── Welcome Section ────────────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-1.5">
                สวัสดีครับ{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base">
                คุณล็อกอินในฐานะ <span className={`font-extrabold ${accentText}`}>{roleLabel}</span>
                {' '}· ติดตามงบประมาณและข้อมูลประสิทธิภาพอย่างใกล้ชิด
              </p>
              {selectedProject && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  กำลังติดตาม: <span className="text-foreground font-semibold">{selectedProject.title}</span>
                </p>
              )}
            </div>
            
            {/* Project selection & sync controls */}
            <div className="flex items-center gap-2.5">
              {projects.length > 1 && (
                <select
                  value={selectedProjectId ?? ''}
                  onChange={(event) => setSelectedProjectId(Number(event.target.value))}
                  className="min-h-10 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-slate-400 cursor-pointer"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.title}</option>
                  ))}
                </select>
              )}
              
              {syncStatus && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${
                  syncStatus.status === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-card border-border text-slate-500 dark:text-slate-400'
                }`}>
                  <Activity className="w-3.5 h-3.5" />
                  {syncStatus.status === 'success'
                    ? `${syncStatus.total_synced} รายการ · ${syncStatus.categories_synced} หมวด`
                    : 'ยังไม่ซิงค์'}
                </div>
              )}
              
              <button
                onClick={triggerSync}
                disabled={loadingSync}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                  isEmployer
                    ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 dark:bg-teal-400/10 dark:border-teal-400/20 dark:text-teal-300'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-400/10 dark:border-indigo-400/20 dark:text-indigo-300'
                }`}
              >
                <Activity className={`w-4 h-4 ${loadingSync ? 'animate-spin' : ''}`} />
                {loadingSync ? 'กำลังซิงค์...' : 'ซิงค์ DW'}
              </button>
            </div>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {loadingProjects && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-4 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>กำลังโหลดโครงการของคุณ...</span>
          </div>
        )}

        {/* ── KPI Stats Row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* CPI */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider">CPI (ดัชนีต้นทุน)</p>
              <TrendingDown className={`w-4 h-4 ${cpiColor}`} />
            </div>
            {loadingOverview ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-1" />
            ) : (
              <p className={`text-3xl font-black ${cpiColor} mb-1`}>
                {overview?.kpis?.cpi?.toFixed(2) ?? '–'}
              </p>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">ค่าเป้าหมายคือ {`>= 1.0`}</p>
            <div className="flex items-center gap-1.5 mt-3">
              <div className={`w-2 h-2 rounded-full ${cpiVal < 0.85 ? 'bg-red-500 animate-pulse' : cpiVal < 0.95 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                {cpiVal < 0.85 ? 'เกินงบประมาณวิกฤต' : cpiVal < 0.95 ? 'เริ่มเกินงบ' : 'อยู่ในงบปกติ'}
              </span>
            </div>
          </div>

          {/* SPI */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider">SPI (ดัชนีเวลา)</p>
              <Clock className={`w-4 h-4 ${spiColor}`} />
            </div>
            {loadingOverview ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-1" />
            ) : (
              <p className={`text-3xl font-black ${spiColor} mb-1`}>
                {overview?.kpis?.spi?.toFixed(2) ?? '–'}
              </p>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">ค่าเป้าหมายคือ {`>= 1.0`}</p>
            <div className="flex items-center gap-1.5 mt-3">
              <div className={`w-2 h-2 rounded-full ${spiVal < 0.85 ? 'bg-red-500 animate-pulse' : spiVal < 0.95 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                {spiVal < 0.85 ? 'งานล่าช้าวิกฤต' : spiVal < 0.95 ? 'เริ่มล่าช้า' : 'ตรงตามแผนงาน'}
              </span>
            </div>
          </div>

          {/* Budget */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider">งบประมาณที่ใช้ไป</p>
              <BarChart3 className="w-4 h-4 text-blue-500" />
            </div>
            {loadingOverview ? (
              <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-1" />
            ) : (
              <p className="text-3xl font-black text-foreground mb-1">
                {formatBudget(overview?.kpis?.actual_cost ?? 0)}
              </p>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">จากงบรวมทั้งหมด {formatBudget(overview?.kpis?.total_budget ?? 0)}</p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3.5">
              <div 
                className={`h-1.5 rounded-full ${accentBg}`} 
                style={{ width: `${Math.min(100, overview?.kpis?.percent_complete ?? 0)}%` }} 
              />
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider">สัญญานเตือนภัย</p>
              <AlertTriangle className={`w-4 h-4 ${riskLevel === 'critical' ? 'text-red-500 animate-bounce' : riskLevel === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`} />
            </div>
            {loadingWarnings ? (
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-1" />
            ) : (
              <p className={`text-3xl font-black ${riskLevel === 'critical' ? 'text-red-600 dark:text-red-400' : riskLevel === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'} mb-1`}>
                {criticalAlerts.length}
              </p>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">หัวข้อโครงการที่มีความเบี่ยงเบน</p>
            <div className="flex items-center gap-1.5 mt-3">
              <div className={`w-2 h-2 rounded-full ${riskLevel === 'critical' ? 'bg-red-500 animate-pulse' : riskLevel === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold capitalize">{riskLevel} status</span>
            </div>
          </div>
        </div>

        {/* ── Dashboard EVM CTA ─────────────────────────────────────────────────── */}
        <div className={`mb-10 rounded-2xl border bg-card p-6 shadow-sm ${isEmployer ? 'border-teal-200 dark:border-teal-400/20' : 'border-indigo-200 dark:border-indigo-400/20'}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${accentSoft}`}>
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-0.5">เข้าใช้งานแผงวิเคราะห์ความเสี่ยงโครงการแบบละเอียด</h3>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300">
                  ตรวจสอบค่าความคุ้มค่า CPI/SPI พร้อมรายละเอียดแผนโครงการ (PV) ผลงานที่ได้ (EV) และงบที่ใช้จริง (AC) แบบลึกที่สุด
                </p>
              </div>
            </div>
            
            <Link
              href={isEmployer ? '/employer/dashboard' : '/contractor/dashboard'}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 cursor-pointer shadow-sm ${
                isEmployer
                  ? 'bg-teal-700 text-white hover:bg-teal-600'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500'
              }`}
            >
              เปิดแผงวิเคราะห์ <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Inline mini metrics progress */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border">
            <div className="text-center">
              <p className={`text-xl font-black ${cpiColor}`}>{overview?.kpis?.cpi?.toFixed(2) ?? '–'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase">Cost Index</p>
            </div>
            <div className="text-center border-x border-border">
              <p className={`text-xl font-black ${spiColor}`}>{overview?.kpis?.spi?.toFixed(2) ?? '–'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase">Schedule Index</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-foreground">{overview?.kpis?.percent_complete ?? 0}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase">ความก้าวหน้า</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* ── Quick Actions ────────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-extrabold text-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
              <span className={`w-1.5 h-4.5 rounded-full ${accentBg}`} />
              บริการและการจัดการด่วน
            </h3>
            
            <div className="space-y-3">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={`${action.href}-${idx}`}
                    href={action.href}
                    className="flex items-center gap-4 bg-card border border-border hover:border-slate-400 dark:hover:border-slate-700 rounded-2xl p-4 transition-all group shadow-sm hover:shadow"
                  >
                    <div className={`p-2.5 rounded-xl border ${accentSoft}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm text-foreground transition-colors ${isEmployer ? 'group-hover:text-teal-700 dark:group-hover:text-teal-300' : 'group-hover:text-indigo-700 dark:group-hover:text-indigo-300'}`}>
                        {action.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{action.desc}</p>
                    </div>
                    
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-foreground transition-colors shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── Recent Alerts ────────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-extrabold text-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-1.5 h-4.5 rounded-full bg-red-500" />
              บันทึกการแจ้งเตือนความเสี่ยงโครงการ
            </h3>
            
            {loadingWarnings ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-16 bg-card border border-border rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : recentAlerts.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
                <Bell className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500 text-xs font-semibold">ไม่มีสัญญาณอันตรายในขณะนี้</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentAlerts.map((alert, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border shadow-sm ${levelBadge(alert.level)}`}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider">{alert.metric}</span>
                        <span className="text-[10px] opacity-70 font-semibold">{alert.date}</span>
                      </div>
                      <p className="text-xs font-semibold">{alert.message}</p>
                    </div>
                    <span className="text-xs font-black shrink-0 font-mono">{alert.value.toFixed(2)}</span>
                  </div>
                ))}

                {/* Risk Matrix Preview */}
                {warnings?.risk_matrix && warnings.risk_matrix.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-extrabold mb-3 uppercase tracking-wider">ตารางวิเคราะห์โอกาส & ผลกระทบภัยพิบัติ (Risk Matrix)</p>
                    <div className="space-y-1.5">
                      {warnings.risk_matrix.slice(0, 4).map((r, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-xs bg-card border border-border p-2 rounded-xl shadow-sm">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            r.level === 'critical' ? 'bg-red-500' : r.level === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span className="text-foreground flex-1 truncate font-semibold">{r.risk}</span>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold">โอกาส {(r.probability * 100).toFixed(0)}%</span>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold">ความรุนแรง {(r.impact * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Project Info ──────────────────────────────────────────────────────── */}
        {overview?.project && (
          <div className="mt-8 bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3 border-b border-border pb-2.5">
              <Package className="w-5 h-5 text-slate-400" />
              <h3 className="font-extrabold text-sm text-foreground uppercase tracking-wider">ข้อมูลโครงการที่เลือก</h3>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-bold mb-0.5">ชื่อเต็มของสัญญา</p>
                <p className="font-semibold text-foreground">{overview.project.title}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-bold mb-0.5">ประเภทการก่อสร้าง</p>
                <p className="font-semibold text-foreground">{overview.project.type}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-bold mb-0.5">สถานะโครงการ</p>
                <p className={`font-black uppercase ${
                  overview.project.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                }`}>{overview.project.status}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-bold mb-0.5">จำนวนวันดำเนินการคงเหลือ</p>
                <p className="font-bold text-foreground">{overview.project.days_remaining} วัน</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
