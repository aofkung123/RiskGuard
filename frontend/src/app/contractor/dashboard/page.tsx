"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown,
  CheckCircle, AlertTriangle, Activity,
} from "lucide-react";
import { apiRequest, fetchCurrentUser } from "@/lib/api";

const COLORS = { Steel: "#60a5fa", Cement: "#a78bfa", Bricks: "#fb923c", Wood: "#4ade80", Stone: "#facc15" };

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  color?: "blue" | "green" | "amber" | "red";
}

interface ProjectOption {
  id: number;
  title: string;
  budget: number;
  status: string;
  employer_name?: string | null;
}

interface TimelinePoint {
  week: string;
  planned: number;
  actual: number;
}

interface CategorySplit {
  category: keyof typeof COLORS | string;
  avg_price: number;
  items: number;
}

interface ActivityItem {
  date: string;
  type: "update" | "warning" | "milestone" | string;
  message: string;
  status: "approved" | "warning" | "completed" | string;
}

interface DashboardData {
  project: {
    type: string;
  };
  kpis: {
    total_budget: number;
    percent_complete: number;
    days_remaining: number;
    cpi: number;
    spi: number;
  };
  timeline: TimelinePoint[];
  category_split: CategorySplit[];
  activities: ActivityItem[];
}

function StatCard({ label, value, sub, trend, color = "blue" }: StatCardProps) {
  const colors: Record<NonNullable<StatCardProps["color"]>, string> = {
    blue: "bg-blue-500/5 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/20 text-blue-750 dark:text-blue-400",
    green: "bg-emerald-500/5 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/20 text-emerald-750 dark:text-emerald-400",
    amber: "bg-amber-500/5 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/20 text-amber-755 dark:text-amber-400",
    red: "bg-red-500/5 dark:bg-red-500/20 border-red-200 dark:border-red-500/20 text-red-750 dark:text-red-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5 shadow-sm`}>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">{sub}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend > 0 ? <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />}
          <span className={`text-xs font-semibold ${trend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        </div>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
    in_progress: "กำลังดำเนินการ",
    completed: "เสร็จสิ้น",
    pending: "รอเริ่มงาน",
  };

export default function DashboardOverview() {
  const [myId, setMyId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [allProjects, setAllProjects] = useState<ProjectOption[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCurrentUser().then((profile) => {
      if (profile?.id) setMyId(profile.id);
      else setLoadingProjects(false);
    });
  }, []);

  const loadProjects = useCallback(async () => {
    if (!myId) return;
    setLoadingProjects(true);
    try {
      setAllProjects(await apiRequest<ProjectOption[]>(`/api/tracking/projects?user_id=${myId}&role=contractor`));
    } catch {
      setError("ไม่สามารถโหลดรายการโครงการได้");
    } finally {
      setLoadingProjects(false);
    }
  }, [myId]);

  useEffect(() => {
    if (!myId) return;
    void Promise.resolve().then(loadProjects);
  }, [myId, loadProjects]);

  const loadProject = async (id: number) => {
    setSelectedProject(id);
    setLoading(true);
    try {
      setData(await apiRequest<DashboardData>(`/api/dashboard/overview?project_id=${id}`));
      setError(null);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลโครงการได้");
    } finally {
      setLoading(false);
    }
  };

  // Project selection screen
  if (!myId) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        {loadingProjects ? "กำลังโหลด..." : "กรุณาเข้าสู่ระบบเพื่อดู Dashboard ของผู้รับเหมา"}
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">เลือกโครงการที่รับทำ</h2>
          <p className="text-slate-650 dark:text-slate-400 text-sm mt-1">เลือกโครงการเพื่อดูข้อมูลและกิจกรรมล่าสุด</p>
        </div>

        {loadingProjects ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : allProjects.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border border-dashed shadow-sm">
            <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">ยังไม่มีโครงการที่รับดูแล</p>
            <p className="text-slate-500 dark:text-slate-450 text-sm mt-1">โครงการที่ผู้ว่าจ้างว่าจ้างคุณจะปรากฏที่นี่</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-2xl">
            {allProjects.map(p => (
              <button key={p.id} onClick={() => void loadProject(p.id)}
                className="flex items-center justify-between bg-card border border-border hover:border-blue-500/50 rounded-2xl p-6 text-left transition-all group shadow-sm hover:shadow-md cursor-pointer">
                <div>
                  <h3 className="text-foreground font-bold text-lg group-hover:text-blue-650 dark:group-hover:text-blue-400 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {p.employer_name || "รอผู้ว่าจ้าง"} · ฿{p.budget?.toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 ml-4 border ${
                  p.status === "completed"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                }`}>
                  {STATUS_LABEL[p.status] || p.status}
                </span>
              </button>
            ))}
          </div>
        )}
        {error && <p className="text-amber-600 dark:text-amber-400 text-sm">{error}</p>}
      </div>
    );
  }

  const project_label = allProjects.find(p => p.id === selectedProject)?.title || "";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
    </div>
  );

  const kpis = data?.kpis;
  const project = data?.project;
  const timeline = data?.timeline || [];
  const split = data?.category_split || [];
  const activities = data?.activities || [];

  const formatMB = (v: number) => `฿${(v / 1000000).toFixed(2)}M`;
  const cpiColor = (kpis?.cpi ?? 0) < 0.85 ? "red" : (kpis?.cpi ?? 0) < 0.95 ? "amber" : "green";
  const spiColor = (kpis?.spi ?? 0) < 0.85 ? "red" : (kpis?.spi ?? 0) < 0.95 ? "amber" : "green";

  const activityIcon = { update: Activity, warning: AlertTriangle, milestone: CheckCircle };
  const activityColor = {
    approved: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    completed: "text-blue-600 dark:text-blue-400"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => { setSelectedProject(null); setData(null); }} className="text-slate-500 hover:text-foreground text-sm mb-2 flex items-center gap-1 transition-colors cursor-pointer font-medium">
            ← กลับเลือกโครงการ
          </button>
          <h2 className="text-2xl font-bold text-foreground">{project_label}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{project?.type || "โครงการ"} · อัปเดตล่าสุด: {new Date().toLocaleDateString("th-TH")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/contractor/variance" className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-600 hover:text-white text-amber-700 dark:text-amber-400 border border-amber-500/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer">
            📊 วิเคราะห์ราคาวัสดุ
          </Link>
          <Link href="/contractor/metrics" className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-750 dark:text-blue-400 border border-blue-500/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer">
            📈 ตัวชี้วัด EVM
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="งบประมาณรวม (BAC)" value={formatMB(kpis?.total_budget ?? 0)} sub="งบที่ตั้งไว้ทั้งโครงการ" color="blue" />
        <StatCard label="ความคืบหน้า" value={`${kpis?.percent_complete ?? 0}%`} sub={`เหลืออีก ${kpis?.days_remaining ?? 0} วัน`} color={(kpis?.percent_complete ?? 0) >= 50 ? "green" : "amber"} trend={5} />
        <StatCard label="ดัชนีต้นทุน (CPI)" value={(kpis?.cpi ?? 0).toFixed(2)} sub={(kpis?.cpi ?? 0) >= 1 ? "อยู่ในงบประมาณ" : "เกินงบประมาณ"} color={cpiColor} />
        <StatCard label="ดัชนีเวลา (SPI)" value={(kpis?.spi ?? 0).toFixed(2)} sub={(kpis?.spi ?? 0) >= 1 ? "เร็วกว่าแผน" : "ล่าช้ากว่าแผน"} color={spiColor} />
      </div>

      {/* Timeline + Category Split */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-foreground font-semibold mb-4">ความคืบหน้า: แผน vs จริง (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={timeline} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fill: "var(--foreground)", opacity: 0.6, fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--foreground)", opacity: 0.6, fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
              <Bar dataKey="planned" name="แผน" fill="#3b82f6" opacity={0.5} radius={[4,4,0,0]} />
              <Bar dataKey="actual"  name="จริง" fill="#10b981" radius={[4,4,0,0]} />
              <Legend wrapperStyle={{ color: "var(--foreground)", opacity: 0.8, fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-foreground font-semibold mb-4">สัดส่วนรายการวัสดุ</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={split} dataKey="items" nameKey="category" cx="50%" cy="50%" outerRadius={65} innerRadius={38}>
                {split.map((e) => (
                  <Cell key={e.category} fill={COLORS[e.category as keyof typeof COLORS] || "#64748b"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {split.map((s) => (
              <div key={s.category} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLORS[s.category as keyof typeof COLORS] || "#64748b" }} />
                  <span className="text-slate-650 dark:text-slate-350">{s.category}</span>
                </div>
                <span className="text-slate-500 dark:text-slate-400">{s.items} รายการ</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-foreground font-semibold mb-4">กิจกรรมล่าสุด</h3>
        <div className="space-y-3">
          {activities.map((a, i) => {
            const Icon = activityIcon[a.type as keyof typeof activityIcon] || Activity;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-55 dark:bg-slate-900/40 border border-border/40">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${activityColor[a.status as keyof typeof activityColor] || "text-slate-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 dark:text-slate-200">{a.message}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{a.date}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  a.status === "approved" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" :
                  a.status === "warning"  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" :
                  "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                }`}>{a.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
