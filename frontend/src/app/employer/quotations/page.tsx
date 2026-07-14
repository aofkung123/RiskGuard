"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  FileText, Clock, CheckCircle2, XCircle,
  DollarSign, User, RefreshCw, type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

interface Quotation {
  id: string;
  sender_id: number;
  sender_name: string;
  timestamp: string;
  status: string;
  title: string;
  description: string;
  amount: number;
}

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  bg: string;
  border: string;
  text: string;
  badge: string;
}

export default function QuotationsPage() {
  const [myId, setMyId] = useState<number | null>(null);
  const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    fetch(`${API}/api/profile/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(d => {
        if (d && d.id) {
          setMyId(d.id);
        } else {
          window.location.href = "/login";
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        window.location.href = "/login";
      });
  }, [API]);

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    if (!myId) return;
    try {
      setQuotations(await apiRequest<Quotation[]>("/api/chat/quotations"));
    } finally {
      setLoading(false);
    }
  }, [myId]);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    await apiRequest('/api/chat/action', {
      method: "POST",
      body: JSON.stringify({ message_id: id, action: "approve" }),
    });
    fetchQuotations();
    setProcessing(null);
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    await apiRequest('/api/chat/action', {
      method: "POST",
      body: JSON.stringify({ message_id: id, action: "reject" }),
    });
    fetchQuotations();
    setProcessing(null);
  };

  const filtered = filter === "all"
    ? quotations
    : quotations.filter(q => q.status === filter);

  const stats = {
    total: quotations.length,
    pending: quotations.filter(q => q.status === "pending").length,
    approved: quotations.filter(q => q.status === "approved").length,
    rejected: quotations.filter(q => q.status === "rejected").length,
  };

  const statusConfig: Record<string, StatusConfig> = {
    pending: {
      label: "รอพิจารณา",
      icon: Clock,
      bg: "bg-amber-50 dark:bg-amber-500/10",
      border: "border-amber-200 dark:border-amber-500/20",
      text: "text-amber-700 dark:text-amber-400",
      badge: "bg-amber-50 dark:bg-amber-500/20 text-amber-750 dark:text-amber-400 border border-amber-250 dark:border-amber-500/20",
    },
    approved: {
      label: "อนุมัติแล้ว",
      icon: CheckCircle2,
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      border: "border-emerald-200 dark:border-emerald-500/20",
      text: "text-emerald-700 dark:text-emerald-400",
      badge: "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-750 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-500/20",
    },
    rejected: {
      label: "ตีกลับ",
      icon: XCircle,
      bg: "bg-red-50 dark:bg-red-500/10",
      border: "border-red-200 dark:border-red-500/20",
      text: "text-red-700 dark:text-red-400",
      badge: "bg-red-50 dark:bg-red-500/20 text-red-750 dark:text-red-400 border border-red-250 dark:border-red-500/20",
    },
  };

  const filterTabs = [
    { key: "all", label: "ทั้งหมด", count: stats.total },
    { key: "pending", label: "รอพิจารณา", count: stats.pending },
    { key: "approved", label: "อนุมัติแล้ว", count: stats.approved },
    { key: "rejected", label: "ตีกลับ", count: stats.rejected },
  ] as const;

  if (!myId || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">พิจารณาใบเสนอราคา</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
            รายการใบเสนอราคาที่ผู้รับเหมาส่งมาให้พิจารณา
          </p>
        </div>
        <button
          onClick={fetchQuotations}
          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-border px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer font-medium"
        >
          <RefreshCw className="w-4 h-4" /> รีเฟรช
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "ทั้งหมด", value: stats.total, icon: FileText, color: "text-foreground" },
          { label: "รอพิจารณา", value: stats.pending, icon: Clock, color: "text-amber-600 dark:text-amber-400" },
          { label: "อนุมัติแล้ว", value: stats.approved, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "ถูกตีกลับ", value: stats.rejected, icon: XCircle, color: "text-red-600 dark:text-red-400" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              filter === tab.key
                ? "bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-400"
                : "bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            {tab.label}
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              filter === tab.key ? "bg-amber-500/30 text-amber-800 dark:text-amber-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Quotation List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card/50 rounded-2xl border border-border border-dashed">
          <FileText className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            {filter === "all" ? "ยังไม่มีใบเสนอราคา" : `ไม่มีใบเสนอราคาสถานะ "${filter === "pending" ? "รอพิจารณา" : filter === "approved" ? "อนุมัติแล้ว" : "ตีกลับ"}"`}
          </p>
          <p className="text-slate-500 dark:text-slate-450 text-sm mt-1">ใบเสนอราคาจะปรากฏที่นี่เมื่อผู้รับเหมาส่งมาให้</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(q => {
            const cfg = statusConfig[q.status] || statusConfig.pending;
            const Icon = cfg.icon;
            const isPending = q.status === "pending";

            return (
              <div
                key={q.id}
                className={`${cfg.bg} ${cfg.border} border rounded-2xl p-6 transition-all`}
              >
                {/* Top Row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl ${cfg.bg}`}>
                      <Icon className={`w-5 h-5 ${cfg.text}`} />
                    </div>
                    <div>
                      <h3 className="text-foreground font-bold text-lg">{q.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {q.sender_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {q.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black text-xl">
                      <DollarSign className="w-5 h-5" />
                      {q.amount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-white/50 dark:bg-slate-900/60 border border-border/40 rounded-xl p-4 mb-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5">รายละเอียด</p>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{q.description}</p>
                </div>

                {/* Action Buttons */}
                {isPending && (
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => handleApprove(q.id)}
                      disabled={processing === q.id}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {processing === q.id ? "กำลังอนุมัติ..." : "✅ อนุมัติใบเสนอราคา"}
                    </button>
                    <button
                      onClick={() => handleReject(q.id)}
                      disabled={processing === q.id}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/10 dark:bg-red-500/20 hover:bg-red-500/20 dark:hover:bg-red-500/30 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-xl font-bold text-sm transition-colors cursor-pointer"
                    >
                      <XCircle className="w-5 h-5" />
                      {processing === q.id ? "กำลัง..." : "ตีกลับ"}
                    </button>
                    <Link
                      href="/employer/chat"
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-border rounded-xl text-sm transition-colors font-bold cursor-pointer"
                    >
                      💬 แชท
                    </Link>
                  </div>
                )}

                {/* Approved / Rejected note */}
                {!isPending && (
                  <div className="flex items-center gap-3 pt-1">
                    <div className={`flex-1 flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold ${
                      q.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-600 dark:text-red-450 border border-red-500/20"
                    }`}>
                      {q.status === "approved" ? (
                        <><CheckCircle2 className="w-4 h-4" /> คุณได้อนุมัติใบเสนอราคานี้แล้ว</>
                      ) : (
                        <><XCircle className="w-4 h-4" /> คุณได้ตีกลับใบเสนอราคานี้แล้ว</>
                      )}
                    </div>
                    <Link
                      href="/employer/chat"
                      className="flex items-center gap-2 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-border rounded-xl text-sm transition-colors font-bold cursor-pointer"
                    >
                      💬 แชท
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
