"use client";
import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis,
  ReferenceLine, Legend,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { apiRequest } from "@/lib/api";

const CAT_COLOR: Record<string, string> = {
  Steel: "#60a5fa", Cement: "#a78bfa", Bricks: "#fb923c", Wood: "#4ade80", Stone: "#facc15",
};

interface VarianceRow {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variance_pct: number;
  avg_market_price: number;
  items_in_market: number;
}

interface VarianceSummary {
  variance_by_category: VarianceRow[];
  summary: {
    total_planned: number;
    total_actual: number;
    total_variance: number;
  };
}

interface CurrentUser {
  id: number;
}

interface ProjectOption {
  id: number;
}

interface ScatterPoint {
  x: number;
  y: number;
  z: number;
  category: string;
}

interface TooltipPayload<T> {
  payload: T;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload<VarianceRow>[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-xs space-y-1 shadow-md">
      <p className="text-foreground font-bold">{d.category}</p>
      <p className="text-slate-500 dark:text-slate-400">แผน: <span className="text-blue-600 dark:text-blue-400">฿{d.planned?.toLocaleString("th-TH")}</span></p>
      <p className="text-slate-500 dark:text-slate-400">จริง: <span className="text-amber-600 dark:text-amber-400">฿{d.actual?.toLocaleString("th-TH")}</span></p>
      <p className="text-slate-500 dark:text-slate-400">ส่วนต่าง: <span className={d.variance >= 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}>
        {d.variance >= 0 ? "+" : ""}฿{d.variance?.toLocaleString("th-TH")} ({d.variance_pct?.toFixed(1)}%)
      </span></p>
      <p className="text-slate-500 dark:text-slate-500">ราคาตลาดเฉลี่ย: ฿{d.avg_market_price?.toLocaleString("th-TH")}</p>
    </div>
  );
};

export default function VariancePage() {
  const [data, setData] = useState<VarianceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVariance() {
      try {
        const profile = await apiRequest<CurrentUser>("/api/profile/me");
        const projects = await apiRequest<ProjectOption[]>(`/api/tracking/projects?user_id=${profile.id}&role=contractor`);
        const projectId = projects[0]?.id;
        if (!projectId) {
          setData(null);
          return;
        }
        setData(await apiRequest<VarianceSummary>(`/api/dashboard/variance?project_id=${projectId}`));
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    void loadVariance();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
    </div>
  );

  const varData = data?.variance_by_category || [];
  const summary = data?.summary || { total_planned: 0, total_actual: 0, total_variance: 0 };

  const totalVariancePct = summary.total_planned
    ? ((summary.total_variance / summary.total_planned) * 100).toFixed(1)
    : "0";

  // Scatter data: planned vs actual
  const scatterData: ScatterPoint[] = varData.map((v) => ({
    x: v.planned / 1000,
    y: v.actual / 1000,
    z: Math.abs(v.variance_pct) * 5,
    category: v.category,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">วิเคราะห์ความเบี่ยงเบนต้นทุน</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Cost Variance Analysis ด้วย ข้อมูลราคาตลาดจาก Onestock, Homepro, Dohome & ThaiWatsadu</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm">งบที่วางแผน</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">฿{(summary.total_planned/1000000).toFixed(2)}M</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm">ต้นทุนจริง</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">฿{(summary.total_actual/1000000).toFixed(2)}M</p>
        </div>
        <div className={`border rounded-2xl p-5 shadow-sm ${summary.total_variance >= 0
          ? "bg-red-500/10 border-red-200 dark:border-red-500/30" : "bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30"}`}>
          <p className="text-slate-500 dark:text-slate-400 text-sm">ส่วนต่างรวม</p>
          <div className="flex items-center gap-2">
            {summary.total_variance >= 0
              ? <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
              : <TrendingDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            <p className={`text-2xl font-bold ${summary.total_variance >= 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
              {summary.total_variance >= 0 ? "+" : ""}฿{(summary.total_variance/1000000).toFixed(2)}M
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{totalVariancePct}% จากแผน</p>
        </div>
      </div>

      {/* Waterfall / Grouped Bar */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-foreground font-semibold mb-4">เปรียบเทียบต้นทุน แผน vs จริง (แยกหมวดวัสดุ)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={varData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="category" tick={{ fill: "var(--foreground)", opacity: 0.6, fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `฿${(v/1000000).toFixed(1)}M`} tick={{ fill: "var(--foreground)", opacity: 0.6, fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: "var(--foreground)", opacity: 0.8, fontSize: 12 }} />
            <Bar dataKey="planned" name="งบแผน" fill="#3b82f6" opacity={0.6} radius={[4,4,0,0]} />
            <Bar dataKey="actual"  name="ต้นทุนจริง" radius={[4,4,0,0]}>
              {varData.map((v) => (
                <Cell key={v.category} fill={v.variance >= 0 ? "#f59e0b" : "#10b981"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Horizontal Variance Bar + Scatter */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Variance % Bar */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-foreground font-semibold mb-4">% ความเบี่ยงเบนต่อหมวด</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...varData].sort((a, b) => Math.abs(b.variance_pct) - Math.abs(a.variance_pct))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "var(--foreground)", opacity: 0.6, fontSize: 11 }} unit="%" domain={[-15, 25]} />
              <YAxis type="category" dataKey="category" tick={{ fill: "var(--foreground)", opacity: 0.6, fontSize: 12 }} width={60} />
              <Tooltip formatter={(v) => [`${Number(v ?? 0).toFixed(1)}%`, "Variance"]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
              <ReferenceLine x={0} stroke="var(--border)" />
              <ReferenceLine x={10}  stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine x={20}  stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
              <Bar dataKey="variance_pct" name="Variance %" radius={[0,4,4,0]}>
                {varData.map((v) => (
                  <Cell key={v.category} fill={
                    v.variance_pct > 20  ? "#ef4444" :
                    v.variance_pct > 10  ? "#f59e0b" :
                    v.variance_pct < 0   ? "#10b981" : "#f59e0b"
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Planned vs Actual Scatter */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-foreground font-semibold mb-1">Planned vs Actual (฿K)</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">วงกลมใหญ่ = เบี่ยงเบนมาก</p>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" dataKey="x" name="Planned" unit="K" tick={{ fill: "var(--foreground)", opacity: 0.6, fontSize: 11 }} label={{ value: "Planned (฿K)", position: "insideBottom", fill: "var(--foreground)", opacity: 0.7, fontSize: 11, dy: 10 }} />
              <YAxis type="number" dataKey="y" name="Actual"  unit="K" tick={{ fill: "var(--foreground)", opacity: 0.6, fontSize: 11 }} />
              <ZAxis type="number" dataKey="z" range={[60, 300]} />
              <ReferenceLine segment={[{x:0,y:0},{x:2000,y:2000}]} stroke="var(--border)" strokeDasharray="4 4" />
              <Tooltip cursor={false} content={(props) => {
                const payload = props.payload as readonly TooltipPayload<ScatterPoint>[] | undefined;
                if (!payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-card border border-border rounded-xl p-2 text-xs shadow-md">
                    <p className="font-bold text-foreground">{d.category}</p>
                    <p className="text-blue-600 dark:text-blue-400">แผน: ฿{d.x.toFixed(0)}K</p>
                    <p className="text-amber-600 dark:text-amber-400">จริง: ฿{d.y.toFixed(0)}K</p>
                  </div>
                );
              }} />
              <Scatter data={scatterData} shape={(props: { cx?: number; cy?: number; payload?: ScatterPoint }) => {
                const { cx = 0, cy = 0, payload } = props;
                return <circle cx={cx} cy={cy} r={14} fill={CAT_COLOR[payload?.category || ""] || "#64748b"} fillOpacity={0.7} stroke="#fff" strokeWidth={1} />;
              }} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm overflow-x-auto">
        <h3 className="text-foreground font-semibold mb-4">รายละเอียดตามหมวดวัสดุ</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-600 dark:text-slate-400 text-xs border-b border-border">
              {["หมวดวัสดุ","งบแผน","ต้นทุนจริง","Variance","% Variance","ราคาตลาดเฉลี่ย","รายการในตลาด"].map(h => (
                <th key={h} className="text-left pb-3 pr-4 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {varData.map((v) => (
              <tr key={v.category} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CAT_COLOR[v.category] || "#64748b" }} />
                    <span className="text-slate-850 dark:text-slate-200 font-medium">{v.category}</span>
                  </div>
                </td>
                <td className="py-2 pr-4 text-blue-600 dark:text-blue-400">฿{v.planned?.toLocaleString("th-TH")}</td>
                <td className="py-2 pr-4 text-amber-600 dark:text-amber-400">฿{v.actual?.toLocaleString("th-TH")}</td>
                <td className={`py-2 pr-4 font-bold ${v.variance >= 0 ? "text-red-655 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                  {v.variance >= 0 ? "+" : ""}฿{v.variance?.toLocaleString("th-TH")}
                </td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    Math.abs(v.variance_pct) > 20 ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/10" :
                    Math.abs(v.variance_pct) > 10 ? "bg-amber-500/10 text-amber-655 dark:text-amber-400 border border-amber-500/10" :
                    "bg-emerald-500/10 text-emerald-750 dark:text-emerald-400 border border-emerald-500/10"
                  }`}>
                    {v.variance_pct >= 0 ? "+" : ""}{v.variance_pct?.toFixed(1)}%
                  </span>
                </td>
                <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">฿{v.avg_market_price?.toLocaleString("th-TH")}</td>
                <td className="py-2 pr-4 text-slate-500 dark:text-slate-450">{v.items_in_market} รายการ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
