"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  Database,
  DollarSign,
  FolderKanban,
  Gauge,
  Loader2,
  Package,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { apiRequest, fetchCurrentUser } from "@/lib/api";

interface VarianceData {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variance_pct: number;
  avg_market_price: number;
  min_price: number;
  max_price: number;
  items_in_market: number;
}

interface SourceBreakdown {
  source: string;
  count: number;
  avg_price: number;
}

interface VarianceSummary {
  project_id: number;
  variance_by_category: VarianceData[];
  source_breakdown: Record<string, SourceBreakdown[]>;
  summary: { total_planned: number; total_actual: number; total_variance: number };
}

interface SyncStatus {
  dw_path: string;
  last_sync: string | null;
  total_synced: number;
  categories_synced: number;
  status: string;
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
    eac: number;
    cpi: number;
    spi: number;
  };
  timeline: { week: string; date: string; planned: number; actual: number }[];
  category_split: { category: string; avg_price: number; items: number }[];
  activities: { date: string; type: string; message: string; status: string }[];
}

interface ProjectOption {
  id: number;
  title: string;
  description: string;
  budget: number;
  status: string;
}

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "neutral" | "blue" | "green" | "amber" | "red";
}

const CATEGORY_LABELS: Record<string, string> = {
  Steel: "เหล็ก",
  Cement: "ปูน",
  Bricks: "อิฐ",
  Wood: "ไม้",
  Stone: "หิน",
};

const PROJECT_STATUS: Record<string, string> = {
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  pending: "รอเริ่มงาน",
};

const METRIC_TONES = {
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  red: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
} as const;

function MetricCard({ label, value, detail, icon: Icon, tone }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${METRIC_TONES[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-2xl font-extrabold text-foreground">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={detail}>{detail}</p>
    </div>
  );
}

function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `฿${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `฿${(value / 1_000).toFixed(0)}K`;
  return `฿${value.toLocaleString("th-TH")}`;
}

function formatCurrency(value: number) {
  return `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function formatSyncTime(value: string | null | undefined) {
  if (!value) return "ยังไม่เคยซิงค์";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default function EmployerDashboardPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [variance, setVariance] = useState<VarianceSummary | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingVar, setLoadingVar] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async (projectId: number) => {
    setLoadingOverview(true);
    try {
      setOverview(await apiRequest<OverviewData>(`/api/dashboard/overview?project_id=${projectId}`));
      setError(null);
    } catch {
      setOverview(null);
      setError("ไม่สามารถโหลดข้อมูลภาพรวมโครงการได้");
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchVariance = async (projectId: number) => {
    setLoadingVar(true);
    try {
      setVariance(await apiRequest<VarianceSummary>(`/api/dashboard/variance?project_id=${projectId}`));
      setError(null);
    } catch {
      setVariance(null);
      setError("ไม่สามารถโหลดข้อมูลความเบี่ยงเบนได้");
    } finally {
      setLoadingVar(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      setSyncStatus(await apiRequest<SyncStatus>("/api/materials/sync-status"));
    } catch {
      setSyncStatus(null);
    }
  };

  const triggerSync = async () => {
    setLoadingSync(true);
    try {
      setSyncStatus(await apiRequest<SyncStatus>("/api/materials/sync-from-dw", { method: "POST" }));
      if (selectedProjectId) await fetchVariance(selectedProjectId);
    } finally {
      setLoadingSync(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function initProjects() {
      try {
        const profile = await fetchCurrentUser();
        if (!active) return;

        if (!profile?.id) {
          setProjects([]);
          setSelectedProjectId(null);
          setOverview(null);
          setVariance(null);
          setError("กรุณาเข้าสู่ระบบก่อนดู Dashboard โครงการ");
          return;
        }

        const list = await apiRequest<ProjectOption[]>(`/api/tracking/projects?user_id=${profile.id}&role=employer`);
        if (!active) return;
        setProjects(list);
        setSelectedProjectId(list[0]?.id ?? null);
        setError(null);
      } catch {
        if (!active) return;
        setProjects([]);
        setSelectedProjectId(null);
        setOverview(null);
        setVariance(null);
        setError("ไม่สามารถโหลดรายการโครงการได้");
      } finally {
        if (active) setLoadingProjects(false);
      }
    }

    void initProjects();
    void Promise.resolve().then(fetchSyncStatus);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    void Promise.resolve().then(() => {
      void fetchOverview(selectedProjectId);
      void fetchVariance(selectedProjectId);
    });
  }, [selectedProjectId]);

  const summary = variance?.summary;
  const categories = variance?.variance_by_category || [];
  const kpis = overview?.kpis;
  const project = overview?.project;
  const selectedProject = projects.find((item) => item.id === selectedProjectId);
  const hasProject = Boolean(selectedProjectId);
  const noProjects = !loadingProjects && !hasProject && projects.length === 0 && !error;
  const hasKpiData = Boolean(kpis && (overview?.timeline?.length ?? 0) > 0);
  const hasVarianceData = categories.length > 0;
  const cpi = kpis?.cpi ?? 0;
  const spi = kpis?.spi ?? 0;
  const budgetUsedPct = hasKpiData && kpis?.total_budget
    ? Math.round((kpis.actual_cost / kpis.total_budget) * 100)
    : 0;
  const worstCategory = hasVarianceData
    ? categories.reduce((a, b) => Math.abs(a.variance_pct) > Math.abs(b.variance_pct) ? a : b)
    : null;
  const sourceRows = variance
    ? Object.entries(variance.source_breakdown).flatMap(([category, sources]) =>
        sources.map((source) => ({ category, ...source })))
    : [];

  const earlyWarnings = [
    ...(hasKpiData && cpi < 0.95 ? [{
      icon: TrendingDown,
      title: "ต้นทุนเริ่มผิดแผน",
      detail: `CPI อยู่ที่ ${cpi.toFixed(2)} ควรตรวจสอบต้นทุนจริงและรายการวัสดุ`,
      critical: cpi < 0.85,
    }] : []),
    ...(hasKpiData && spi < 0.95 ? [{
      icon: Clock3,
      title: "กำหนดการเริ่มล่าช้า",
      detail: `SPI อยู่ที่ ${spi.toFixed(2)} ควรทบทวนแผนงานและขั้นตอนที่รอยืนยัน`,
      critical: spi < 0.85,
    }] : []),
    ...(worstCategory && Math.abs(worstCategory.variance_pct) > 10 ? [{
      icon: Package,
      title: "งบวัสดุเบี่ยงเบน",
      detail: `${CATEGORY_LABELS[worstCategory.category] || worstCategory.category} ต่างจากแผน ${worstCategory.variance_pct > 0 ? "+" : ""}${worstCategory.variance_pct}%`,
      critical: Math.abs(worstCategory.variance_pct) > 20,
    }] : []),
  ];

  const cpiTone: MetricCardProps["tone"] = !hasKpiData ? "neutral" : cpi < 0.85 ? "red" : cpi < 0.95 ? "amber" : "green";
  const spiTone: MetricCardProps["tone"] = !hasKpiData ? "neutral" : spi < 0.85 ? "red" : spi < 0.95 ? "amber" : "green";
  const varianceTone: MetricCardProps["tone"] = !worstCategory ? "neutral" : Math.abs(worstCategory.variance_pct) > 15 ? "red" : Math.abs(worstCategory.variance_pct) > 10 ? "amber" : "green";

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-5 border-b border-border pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <Gauge className="h-4 w-4" />
            Risk overview
          </div>
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">ภาพรวมความเสี่ยงโครงการ</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            {selectedProject?.title || project?.title || "เลือกโครงการเพื่อดูสถานะต้นทุน เวลา และงบวัสดุจากข้อมูลหลังบ้าน"}
          </p>
        </div>

        {hasProject && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="project-select">เลือกโครงการ</label>
            <select
              id="project-select"
              value={selectedProjectId ?? ""}
              onChange={(event) => setSelectedProjectId(Number(event.target.value))}
              className="h-10 min-w-52 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-amber-500"
            >
              {projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <button
              type="button"
              onClick={triggerSync}
              disabled={loadingSync}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loadingSync ? "animate-spin" : ""}`} />
              {loadingSync ? "กำลังซิงค์" : "ซิงค์ข้อมูล DW"}
            </button>
          </div>
        )}
      </section>

      {(loadingProjects || error) && (
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
          error
            ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
            : "border-border bg-card text-slate-600 dark:text-slate-400"
        }`}>
          {loadingProjects ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{loadingProjects ? "กำลังโหลดโครงการของคุณ..." : error}</span>
        </div>
      )}

      {noProjects && (
        <section className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-900">
            <FolderKanban className="h-6 w-6" />
          </span>
          <h2 className="text-xl font-bold text-foreground">ยังไม่มีงานในระบบหลังบ้าน</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">
            เมื่อมีโครงการที่ผูกกับบัญชีนี้ Dashboard จะแสดง CPI, SPI, งบวัสดุ และความเสี่ยงจากข้อมูลจริงเท่านั้น
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/employer/search" className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400">ค้นหาผู้รับเหมา</Link>
            <Link href="/projects" className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-slate-50 dark:hover:bg-slate-900">ดูรายการโครงการ</Link>
          </div>
        </section>
      )}

      {hasProject && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="ประสิทธิภาพต้นทุน (CPI)"
              value={hasKpiData ? cpi.toFixed(2) : "–"}
              detail={hasKpiData ? (cpi >= 1 ? "ต้นทุนอยู่ในแผน" : "ต้นทุนสูงกว่าแผน") : "ยังไม่มีข้อมูล EVM"}
              icon={TrendingDown}
              tone={cpiTone}
            />
            <MetricCard
              label="ประสิทธิภาพเวลา (SPI)"
              value={hasKpiData ? spi.toFixed(2) : "–"}
              detail={hasKpiData ? (spi >= 1 ? "งานเป็นไปตามกำหนด" : "งานล่าช้ากว่าแผน") : "ยังไม่มีข้อมูล EVM"}
              icon={Clock3}
              tone={spiTone}
            />
            <MetricCard
              label="ต้นทุนจริง"
              value={hasKpiData && kpis ? formatCompactCurrency(kpis.actual_cost) : "–"}
              detail={hasKpiData ? `ใช้ไป ${budgetUsedPct}% ของงบโครงการ` : "ยังไม่มี snapshot ต้นทุน"}
              icon={DollarSign}
              tone={hasKpiData ? "blue" : "neutral"}
            />
            <MetricCard
              label="ความเบี่ยงเบนสูงสุด"
              value={worstCategory ? `${worstCategory.variance_pct > 0 ? "+" : ""}${worstCategory.variance_pct}%` : "–"}
              detail={worstCategory ? CATEGORY_LABELS[worstCategory.category] || worstCategory.category : "ยังไม่มีข้อมูลงบวัสดุ"}
              icon={AlertTriangle}
              tone={varianceTone}
            />
          </section>

          {(loadingOverview || loadingVar) ? (
            <div className="flex min-h-72 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-8">
                <section>
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                        <BarChart3 className="h-5 w-5 text-amber-500" />
                        งบประมาณวัสดุ
                      </h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">เปรียบเทียบงบวางแผนกับราคาตลาดจาก Data Warehouse</p>
                    </div>
                    {hasVarianceData && summary && (
                      <span className={`text-sm font-bold ${summary.total_variance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        ส่วนต่างรวม {summary.total_variance > 0 ? "+" : ""}{formatCurrency(summary.total_variance)}
                      </span>
                    )}
                  </div>

                  {hasVarianceData && summary ? (
                    <div className="overflow-hidden rounded-lg border border-border bg-card">
                      <div className="grid grid-cols-1 border-b border-border sm:grid-cols-3">
                        {[
                          { label: "งบวางแผน", value: summary.total_planned, color: "text-foreground" },
                          { label: "ราคาตลาดประเมิน", value: summary.total_actual, color: summary.total_variance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400" },
                          { label: "ส่วนต่าง", value: summary.total_variance, color: summary.total_variance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400" },
                        ].map((item, index) => (
                          <div key={item.label} className={`px-5 py-4 ${index > 0 ? "border-t border-border sm:border-l sm:border-t-0" : ""}`}>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                            <p className={`mt-1 text-lg font-extrabold ${item.color}`}>{index === 2 && item.value > 0 ? "+" : ""}{formatCurrency(item.value)}</p>
                          </div>
                        ))}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left">
                          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                            <tr>
                              <th className="px-5 py-3">หมวดวัสดุ</th>
                              <th className="px-4 py-3 text-right">งบแผน</th>
                              <th className="px-4 py-3 text-right">ราคาตลาด</th>
                              <th className="px-4 py-3 text-right">ส่วนต่าง</th>
                              <th className="px-5 py-3">ระดับความเสี่ยง</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {categories.map((category) => {
                              const overBudget = category.variance > 0;
                              const critical = Math.abs(category.variance_pct) > 15;
                              const warning = Math.abs(category.variance_pct) > 10;
                              const riskColor = critical ? "bg-red-500" : warning ? "bg-amber-500" : "bg-emerald-500";
                              return (
                                <tr key={category.category} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                                  <td className="px-5 py-4">
                                    <p className="font-semibold text-foreground">{CATEGORY_LABELS[category.category] || category.category}</p>
                                    <p className="text-xs text-slate-500">{category.items_in_market} รายการในตลาด</p>
                                  </td>
                                  <td className="px-4 py-4 text-right text-sm font-medium text-foreground">{formatCurrency(category.planned)}</td>
                                  <td className="px-4 py-4 text-right text-sm font-medium text-foreground">{formatCurrency(category.actual)}</td>
                                  <td className={`px-4 py-4 text-right text-sm font-bold ${overBudget ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                    {overBudget ? "+" : ""}{category.variance_pct}%
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div className={`h-full rounded-full ${riskColor}`} style={{ width: `${Math.min(100, Math.max(8, Math.abs(category.variance_pct) * 3))}%` }} />
                                      </div>
                                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{critical ? "สูง" : warning ? "เฝ้าระวัง" : "ปกติ"}</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
                      <Package className="mx-auto h-7 w-7 text-slate-400" />
                      <h3 className="mt-3 font-bold text-foreground">ยังไม่มีข้อมูลงบวัสดุของโครงการนี้</h3>
                      <p className="mt-1 text-sm text-slate-500">ข้อมูลจะแสดงเมื่อมีการบันทึกงบวัสดุในหลังบ้าน</p>
                    </div>
                  )}
                </section>

                {sourceRows.length > 0 && (
                  <section>
                    <div className="mb-4">
                      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                        <Database className="h-5 w-5 text-blue-600" />
                        แหล่งข้อมูลราคา
                      </h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ราคาตลาดเฉลี่ยแยกตามแหล่งข้อมูลที่ซิงค์เข้าระบบ</p>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border bg-card">
                      <table className="w-full min-w-[620px] text-left">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                          <tr>
                            <th className="px-5 py-3">หมวด</th>
                            <th className="px-5 py-3">แหล่งข้อมูล</th>
                            <th className="px-5 py-3 text-right">จำนวนรายการ</th>
                            <th className="px-5 py-3 text-right">ราคาเฉลี่ย</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {sourceRows.map((row) => (
                            <tr key={`${row.category}-${row.source}`}>
                              <td className="px-5 py-3.5 text-sm font-semibold text-foreground">{CATEGORY_LABELS[row.category] || row.category}</td>
                              <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300">{row.source}</td>
                              <td className="px-5 py-3.5 text-right text-sm text-slate-600 dark:text-slate-300">{row.count}</td>
                              <td className="px-5 py-3.5 text-right text-sm font-bold text-foreground">{formatCurrency(row.avg_price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>

              <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                <section className="rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                    <h2 className="flex items-center gap-2 font-bold text-foreground">
                      <Zap className="h-[18px] w-[18px] text-red-500" />
                      การแจ้งเตือน
                    </h2>
                    <span className={`rounded-md px-2 py-1 text-xs font-bold ${earlyWarnings.length ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"}`}>
                      {earlyWarnings.length || "ปกติ"}
                    </span>
                  </div>
                  {earlyWarnings.length ? (
                    <div className="divide-y divide-border">
                      {earlyWarnings.map((warning) => (
                        <div key={warning.title} className="flex gap-3 px-4 py-4">
                          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${warning.critical ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"}`}>
                            <warning.icon className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-bold text-foreground">{warning.title}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{warning.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-3 px-4 py-5">
                      <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                      <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">ไม่พบการแจ้งเตือนจากข้อมูลปัจจุบันของโครงการ</p>
                    </div>
                  )}
                </section>

                <section className="rounded-lg border border-border bg-card p-4">
                  <h2 className="flex items-center gap-2 font-bold text-foreground">
                    <FolderKanban className="h-[18px] w-[18px] text-blue-600" />
                    สถานะโครงการ
                  </h2>
                  <dl className="mt-4 divide-y divide-border text-sm">
                    <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                      <dt className="text-slate-500">สถานะ</dt>
                      <dd className="font-semibold text-foreground">{PROJECT_STATUS[project?.status || selectedProject?.status || ""] || project?.status || selectedProject?.status || "–"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-slate-500">งบรวม</dt>
                      <dd className="font-semibold text-foreground">{kpis ? formatCurrency(kpis.total_budget) : selectedProject ? formatCurrency(selectedProject.budget) : "–"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-slate-500">ความคืบหน้า</dt>
                      <dd className="font-semibold text-foreground">{hasKpiData ? `${kpis?.percent_complete ?? 0}%` : "–"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                      <dt className="text-slate-500">เวลาคงเหลือ</dt>
                      <dd className="font-semibold text-foreground">{hasKpiData ? `${kpis?.days_remaining ?? 0} วัน` : "–"}</dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${syncStatus?.status === "success" ? "bg-emerald-500" : "bg-slate-400"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">Data Warehouse</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {syncStatus ? `${syncStatus.total_synced} รายการ · ${syncStatus.categories_synced} หมวด` : "ยังไม่มีสถานะการซิงค์"}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">{formatSyncTime(syncStatus?.last_sync)}</p>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}
