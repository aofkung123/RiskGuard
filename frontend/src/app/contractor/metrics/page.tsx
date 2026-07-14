"use client";
import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { apiRequest } from "@/lib/api";

interface Thresholds {
  critical: number;
  warning: number;
}

interface Snapshot {
  week: string;
  date: string;
  pv: number;
  ev: number;
  ac: number;
  cpi: number;
  spi: number;
  cv: number;
  eac: number;
  vac: number;
  tcpi: number;
}

interface EvmData {
  bac: number;
  latest: Snapshot;
  snapshots: Snapshot[];
}

interface CurrentUser {
  id: number;
}

interface ProjectOption {
  id: number;
}

interface TooltipPayload {
  dataKey: keyof Snapshot;
  name: string;
  color: string;
  value: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function EVMGauge({ label, value, thresholds = { critical: 0.85, warning: 0.95 } }: { label: string; value: number; thresholds?: Thresholds }) {
  const color = value < thresholds.critical ? "#ef4444"
    : value < thresholds.warning ? "#f59e0b" : "#10b981";
  const status = value < thresholds.critical ? "⚠ วิกฤต"
    : value < thresholds.warning ? "⚡ เฝ้าระวัง" : "✅ ปกติ";

  return (
    <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center shadow-sm">
      <RadialBarChart width={180} height={180} cx={90} cy={90}
        innerRadius={60} outerRadius={80} barSize={14}
        data={[{ value: Math.min(value * 100, 120), fill: color }]}
        startAngle={90} endAngle={-270}>
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar background={{ fill: "var(--border)" }} dataKey="value" cornerRadius={8} />
        <text x={90} y={83} textAnchor="middle" fill="var(--foreground)" fontSize={26} fontWeight="bold">
          {value.toFixed(2)}
        </text>
        <text x={90} y={103} textAnchor="middle" fill="var(--foreground)" opacity={0.6} fontSize={12}>{label}</text>
      </RadialBarChart>
      <span style={{ color }} className="text-sm font-bold mt-1">{status}</span>
      <div className="flex gap-3 mt-3 text-[10px] text-slate-500 dark:text-slate-450">
        <span>🔴 &lt;0.85</span><span>🟡 0.85-0.95</span><span>🟢 &gt;0.95</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit = "", desc, color = "slate" }: { label: string; value: string | number; unit?: string; desc?: string; color?: "green" | "red" | "amber" | "blue" | "slate" }) {
  const colors: Record<"green" | "red" | "amber" | "blue" | "slate", string> = {
    green: "text-emerald-700 dark:text-emerald-450",
    red: "text-red-700 dark:text-red-400",
    amber: "text-amber-700 dark:text-amber-400",
    blue: "text-blue-700 dark:text-blue-400",
    slate: "text-foreground",
  };
  return (
    <div className="bg-slate-50 dark:bg-slate-950/40 border border-border rounded-xl p-4">
      <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>
        {typeof value === "number" ? value.toLocaleString("th-TH") : value}
        <span className="text-sm font-normal ml-1">{unit}</span>
      </p>
      {desc && <p className="text-slate-500 dark:text-slate-450 text-xs mt-1">{desc}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-md">
      <p className="text-slate-700 dark:text-slate-350 font-semibold mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-foreground font-bold">
            {p.dataKey === "pv" || p.dataKey === "ev" || p.dataKey === "ac"
              ? `฿${(p.value / 1000000).toFixed(2)}M`
              : p.value.toFixed(4)}
          </span>
        </div>
      ))}
    </div>
  );
};

const EMPTY_SNAPSHOT: Snapshot = {
  week: "-",
  date: "",
  pv: 0,
  ev: 0,
  ac: 0,
  cpi: 0,
  spi: 0,
  cv: 0,
  eac: 0,
  vac: 0,
  tcpi: 0,
};

export default function MetricsPage() {
  const [data, setData] = useState<EvmData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const profile = await apiRequest<CurrentUser>("/api/profile/me");
        const projects = await apiRequest<ProjectOption[]>(`/api/tracking/projects?user_id=${profile.id}&role=contractor`);
        const projectId = projects[0]?.id;
        if (!projectId) {
          setData(null);
          return;
        }
        setData(await apiRequest<EvmData>(`/api/dashboard/evm?project_id=${projectId}`));
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    void loadMetrics();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
    </div>
  );

  const latest = data?.latest || EMPTY_SNAPSHOT;
  const snapshots = data?.snapshots || [];
  const bac = data?.bac || 0;
  const formatM = (v: number) => `฿${(v / 1000000).toFixed(2)}M`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">ตัวชี้วัดประสิทธิภาพ EVM</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Earned Value Management & CPI & SPI Tracking</p>
      </div>

      {/* Gauges */}
      <div className="grid md:grid-cols-3 gap-6">
        <EVMGauge label="CPI (ดัชนีต้นทุน)" value={latest.cpi || 0} />
        <EVMGauge label="SPI (ดัชนีเวลา)" value={latest.spi || 0} />
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-sm">
          <p className="text-foreground font-semibold mb-2">สรุปตัวชี้วัดล่าสุด</p>
          <MetricCard label="BAC (งบรวม)"   value={formatM(bac)}             color="blue" />
          <MetricCard label="EAC (ประมาณการสิ้นสุด)" value={formatM(latest.eac || 0)} color={latest.eac > bac ? "red" : "green"} />
          <MetricCard label="VAC (ส่วนต่างงบ)"  value={formatM(latest.vac || 0)}  color={latest.vac < 0 ? "red" : "green"} />
          <MetricCard label="TCPI"           value={(latest.tcpi || 0).toFixed(3)} color={latest.tcpi > 1.1 ? "amber" : "green"} desc="ประสิทธิภาพที่ต้องทำให้ได้" />
        </div>
      </div>

      {/* S-Curve */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-foreground font-semibold mb-4">S-Curve: PV vs EV vs AC</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={snapshots}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="week" tick={{ fill: "var(--foreground)", opacity: 0.6, fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `฿${(v/1000000).toFixed(1)}M`} tick={{ fill: "var(--foreground)", opacity: 0.6, fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: "var(--foreground)", opacity: 0.8, fontSize: 12 }} />
            <Line type="monotone" dataKey="pv" name="PV (แผน)" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 3" />
            <Line type="monotone" dataKey="ev" name="EV (สำเร็จ)" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981", r: 3 }} />
            <Line type="monotone" dataKey="ac" name="AC (จริง)" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* CPI/SPI Trend */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-foreground font-semibold mb-4">แนวโน้ม CPI & SPI</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={snapshots}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="week" tick={{ fill: "var(--foreground)", opacity: 0.6, fontSize: 11 }} />
            <YAxis domain={[0.7, 1.2]} tick={{ fill: "var(--foreground)", opacity: 0.6, fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: "var(--foreground)", opacity: 0.8, fontSize: 12 }} />
            <ReferenceLine y={1.0}  stroke="var(--border)" strokeDasharray="4 2" label={{ value: "เกณฑ์ 1.0", fill: "var(--foreground)", opacity: 0.7, fontSize: 10 }} />
            <ReferenceLine y={0.95} stroke="#d97706" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={0.85} stroke="#dc2626" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Line type="monotone" dataKey="cpi" name="CPI" stroke="#60a5fa" strokeWidth={2.5} dot={{ fill: "#60a5fa", r: 3 }} />
            <Line type="monotone" dataKey="spi" name="SPI" stroke="#f472b6" strokeWidth={2.5} dot={{ fill: "#f472b6", r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Snapshot Table */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm overflow-x-auto">
        <h3 className="text-foreground font-semibold mb-4">ตาราง Snapshot รายสัปดาห์</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-600 dark:text-slate-400 text-xs border-b border-border">
              {["Week","PV","EV","AC","CPI","SPI","CV","EAC"].map(h => (
                <th key={h} className="text-left pb-3 pr-4 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {snapshots.map((s, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                <td className="py-2 pr-4 text-slate-850 dark:text-slate-200">{s.week}</td>
                <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">{formatM(s.pv)}</td>
                <td className="py-2 pr-4 text-emerald-700 dark:text-emerald-400">{formatM(s.ev)}</td>
                <td className="py-2 pr-4 text-amber-600 dark:text-amber-400">{formatM(s.ac)}</td>
                <td className={`py-2 pr-4 font-bold ${s.cpi < 0.85 ? "text-red-600 dark:text-red-400" : s.cpi < 0.95 ? "text-amber-650 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>{s.cpi.toFixed(3)}</td>
                <td className={`py-2 pr-4 font-bold ${s.spi < 0.85 ? "text-red-600 dark:text-red-400" : s.spi < 0.95 ? "text-amber-655 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>{s.spi.toFixed(3)}</td>
                <td className={`py-2 pr-4 ${s.cv < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>{formatM(s.cv)}</td>
                <td className="py-2 pr-4 text-slate-850 dark:text-slate-200">{formatM(s.eac)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
