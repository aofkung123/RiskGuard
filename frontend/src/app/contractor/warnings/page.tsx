"use client";
import React, { useState, useEffect } from "react";
import { AlertTriangle, AlertOctagon, CheckCircle2, DollarSign, Clock, Shield, type LucideIcon } from "lucide-react";
import { apiRequest } from "@/lib/api";

// Simplified warnings page focused on budget overrun + deadline alerts
interface Alert {
  type: "budget" | "deadline" | "info";
  level: "critical" | "warning" | "normal";
  title: string;
  detail: string;
  value: string;
  action: string;
}

interface OverviewData {
  project: { title?: string };
  kpis: {
    cpi?: number;
    spi?: number;
    days_remaining?: number;
    percent_complete?: number;
    total_budget?: number;
    actual_cost?: number;
    eac?: number;
  };
}

interface CurrentUser {
  id: number;
}

interface ProjectOption {
  id: number;
}

interface LevelConfig {
  bg: string;
  border: string;
  text: string;
  icon: LucideIcon;
  label: string;
}

export default function WarningsPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWarnings() {
      try {
        const profile = await apiRequest<CurrentUser>("/api/profile/me");
        const projects = await apiRequest<ProjectOption[]>(`/api/tracking/projects?user_id=${profile.id}&role=contractor`);
        const projectId = projects[0]?.id;
        if (!projectId) {
          setData(null);
          return;
        }
        setData(await apiRequest<OverviewData>(`/api/dashboard/overview?project_id=${projectId}`));
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    void loadWarnings();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400" />
    </div>
  );

  const kpis = data?.kpis || {};
  const project = data?.project || {};

  // Derive alerts from real KPI data
  const alerts: Alert[] = [];

  const cpi = kpis.cpi ?? 1;
  const spi = kpis.spi ?? 1;
  const daysRemaining = kpis.days_remaining ?? 0;
  const percentComplete = kpis.percent_complete ?? 0;
  const totalBudget = kpis.total_budget ?? 0;
  const actualCost = kpis.actual_cost ?? 0;
  const eac = kpis.eac ?? 0;

  // Budget alerts
  if (cpi < 0.85) {
    alerts.push({
      type: "budget", level: "critical",
      title: "เกินงบประมาณ — ระดับวิกฤต",
      detail: `ดัชนีต้นทุน (CPI) = ${cpi.toFixed(2)} บ่งชี้ว่าต้นทุนจริงสูงกว่าแผนมาก ค่าประมาณสิ้นสุดโครงการ (EAC) = ฿${eac.toLocaleString()}`,
      value: `CPI ${cpi.toFixed(2)}`,
      action: "ตรวจสอบรายการค่าใช้จ่ายทันที และประชุมทีมเพื่อหาทางลดต้นทุน"
    });
  } else if (cpi < 0.95) {
    alerts.push({
      type: "budget", level: "warning",
      title: "ต้นทุนเริ่มเกินแผน",
      detail: `ดัชนีต้นทุน (CPI) = ${cpi.toFixed(2)} ต้นทุนจริงสูงกว่าแผนเล็กน้อย ต้องติดตามอย่างใกล้ชิด`,
      value: `CPI ${cpi.toFixed(2)}`,
      action: "ทบทวนรายการวัสดุราคาสูงและเจรจาซัพพลายเออร์"
    });
  } else {
    alerts.push({
      type: "budget", level: "normal",
      title: "งบประมาณอยู่ในเกณฑ์ปกติ",
      detail: `CPI = ${cpi.toFixed(2)} — ต้นทุนจริงสอดคล้องกับแผนงาน`,
      value: `CPI ${cpi.toFixed(2)}`,
      action: "คงประสิทธิภาพการใช้งบประมาณในระดับนี้"
    });
  }

  // Deadline alerts
  if (spi < 0.85) {
    alerts.push({
      type: "deadline", level: "critical",
      title: "กำหนดส่งงาน — ล่าช้าวิกฤต",
      detail: `ดัชนีกำหนดการ (SPI) = ${spi.toFixed(2)} เหลือเวลาอีก ${daysRemaining} วัน แต่ความคืบหน้าเพียง ${percentComplete}%`,
      value: `SPI ${spi.toFixed(2)}`,
      action: "เพิ่มจำนวนแรงงานหรือทำงานล่วงเวลาเพื่อเร่งงาน"
    });
  } else if (spi < 0.95) {
    alerts.push({
      type: "deadline", level: "warning",
      title: "กำหนดส่งงาน — เริ่มล่าช้า",
      detail: `SPI = ${spi.toFixed(2)} เหลือ ${daysRemaining} วัน ความคืบหน้า ${percentComplete}% ต้องเร่งดำเนินการ`,
      value: `${daysRemaining} วัน`,
      action: "ปรับลำดับความสำคัญกิจกรรมและทบทวนแผนการทำงาน"
    });
  } else {
    alerts.push({
      type: "deadline", level: "normal",
      title: "กำหนดการปกติ",
      detail: `SPI = ${spi.toFixed(2)} เหลือ ${daysRemaining} วัน ความคืบหน้า ${percentComplete}% — อยู่ในแผน`,
      value: `${daysRemaining} วัน`,
      action: "รักษาจังหวะการทำงานในระดับปัจจุบัน"
    });
  }

  const overallLevel = alerts.some(a => a.level === "critical") ? "critical" :
    alerts.some(a => a.level === "warning") ? "warning" : "normal";

  const levelConfig: Record<Alert["level"], LevelConfig> = {
    critical: { bg: "bg-red-500/10", border: "border-red-200 dark:border-red-500/40", text: "text-red-700 dark:text-red-400", icon: AlertOctagon, label: "วิกฤต" },
    warning:  { bg: "bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/40", text: "text-amber-700 dark:text-amber-400", icon: AlertTriangle, label: "เฝ้าระวัง" },
    normal:   { bg: "bg-blue-500/10", border: "border-blue-200 dark:border-blue-500/40", text: "text-blue-700 dark:text-blue-400", icon: CheckCircle2, label: "ปกติ" },
  };
  const overallCfg = levelConfig[overallLevel];
  const OverallIcon = overallCfg.icon;

  return (
    <div className="p-8 space-y-6">
      {/* Header with blue accent */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">ระบบแจ้งเตือน</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm ml-1">โครงการ: {project.title || "–"}</p>
        </div>
      </div>

      {/* Overall Banner with blue tint */}
      <div className={`bg-gradient-to-r from-blue-500/10 to-card/90 ${overallCfg.bg} ${overallCfg.border} border rounded-2xl p-5 flex items-center gap-4 shadow-sm`}>
        <div className="p-3 bg-blue-500/20 rounded-xl shrink-0">
          <OverallIcon className={`w-8 h-8 ${overallCfg.text} shrink-0`} />
        </div>
        <div>
          <p className="text-foreground font-bold text-lg">สถานะโดยรวม: <span className={overallCfg.text}>{overallCfg.label}</span></p>
          <p className="text-slate-600 dark:text-slate-400 text-sm">ระบบตรวจพบ {alerts.filter(a => a.level !== "normal").length} เงื่อนไขที่ต้องดูแล</p>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid md:grid-cols-2 gap-5">
        {alerts.map((alert, i) => {
          const cfg = levelConfig[alert.level];
          const Icon = alert.type === "budget" ? DollarSign : Clock;
          return (
            <div key={i} className={`${cfg.bg} ${cfg.border} border rounded-2xl p-6 space-y-4 shadow-sm`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${cfg.bg}`}>
                    <Icon className={`w-5 h-5 ${cfg.text}`} />
                  </div>
                  <div>
                    <h3 className="text-foreground font-bold">{alert.title}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.text} mt-1 inline-block`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
                <div className={`text-2xl font-black ${cfg.text}`}>{alert.value}</div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{alert.detail}</p>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-border/40 rounded-xl p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">⚡ การดำเนินการแนะนำ:</p>
                <p className="text-slate-700 dark:text-slate-300 text-sm">{alert.action}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "งบประมาณ (BAC)", value: `฿${(totalBudget/1e6).toFixed(2)}M`, sub: "งบทั้งโครงการ" },
          { label: "ต้นทุนจริง (AC)", value: `฿${(actualCost/1e6).toFixed(2)}M`, sub: `${percentComplete}% ของงาน` },
          { label: "ประมาณสิ้นสุด (EAC)", value: `฿${(eac/1e6).toFixed(2)}M`, sub: cpi < 1 ? "⚠️ เกินงบ" : "✓ อยู่ในงบ" },
          { label: "เหลือเวลา", value: `${daysRemaining} วัน`, sub: `${percentComplete}% เสร็จแล้ว` },
        ].map((item) => (
          <div key={item.label} className="bg-card border border-border hover:border-blue-500/30 rounded-xl p-4 transition-colors shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">{item.label}</p>
            <p className="text-foreground font-bold text-xl">{item.value}</p>
            <p className="text-slate-500 dark:text-slate-450 text-xs mt-1">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
