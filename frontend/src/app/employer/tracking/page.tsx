"use client";
import React, { useState, useEffect } from "react";
import {
  CheckCircle2, Activity, Clock, RefreshCw,
  Building2, ArrowLeft, Calendar, DollarSign, User, MessageSquare, X
} from "lucide-react";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/ui/SafeImage";

interface Project {
  id: number;
  title: string;
  description: string;
  budget: number;
  start_date: string;
  end_date: string;
  status: string;
  contractor_id: number;
  contractor_name: string;
  quotation_id: number;
  quotation?: {
    id: number;
    title: string;
    amount: number;
    status: string;
  };
}

interface Stage {
  id: number;
  stage_name: string;
  status: "pending" | "active" | "done_pending" | "completed";
  timestamp: string;
  proof_image_url?: string;
  awaiting_confirm: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  in_progress: "กำลังดำเนินการ",
  completed: "โครงการสำเร็จ",
  pending: "รอเริ่มงาน",
};

export default function EmployerTrackingPage() {
  const router = useRouter();
  const [myId, setMyId] = useState<number | null>(null);
  const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

  const getImageUrl = (url: string) => {
    if (!url) return "";
    let cleanUrl = url;
    if (cleanUrl.startsWith("/uploads/tracking/")) {
      cleanUrl = cleanUrl.replace("/uploads/tracking/", "/api/tracking/images/");
    }
    return cleanUrl.startsWith("http") ? cleanUrl : `${API}${cleanUrl}`;
  };

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

  const [projects, setProjects]             = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [stages, setStages]                 = useState<Stage[]>([]);
  const [confirming, setConfirming]         = useState<string | null>(null);
  const [projectComplete, setProjectComplete] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  // Load projects
  useEffect(() => {
    if (!myId) return;
    fetch(`${API}/api/tracking/projects?user_id=${myId}&role=employer`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setProjects(data); setLoadingProjects(false); })
      .catch(() => setLoadingProjects(false));
  }, [myId, API, token]);

  // Polling keeps authentication on every refresh; EventSource cannot send auth headers.
  useEffect(() => {
    if (!selectedProject) return;
    const tokenStr = localStorage.getItem("token");

    const fetchStages = () => {
      fetch(`${API}/api/tracking/stages?project_id=${selectedProject.id}`, { 
        headers: { Authorization: `Bearer ${tokenStr}` } 
      })
        .then(r => {
          if (!r.ok) throw new Error("Failed to fetch stages");
          return r.json();
        })
        .then(data => {
          if (Array.isArray(data)) setStages(data);
        })
        .catch((err) => console.error("fetchStages error:", err));
    };

    fetchStages();

    const intervalId = setInterval(fetchStages, 4000);

    return () => {
      clearInterval(intervalId);
    };
  }, [selectedProject, API]);

  const handleConfirm = (stageName: string) => {
    if (!selectedProject) return;
    setConfirming(stageName);
    const currentToken = localStorage.getItem("token");
    fetch(`${API}/api/tracking/confirm_stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
      body: JSON.stringify({ project_id: selectedProject.id, stage_name: stageName }),
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to confirm stage");
        return r.json();
      })
      .then(data => {
        if (data.project_complete) setProjectComplete(true);
        setConfirming(null);
        // Reload stages
        fetch(`${API}/api/tracking/stages?project_id=${selectedProject.id}`, { headers: { Authorization: `Bearer ${currentToken}` } })
          .then(r => {
            if (!r.ok) throw new Error("Failed to fetch stages");
            return r.json();
          })
          .then(data => {
            if (Array.isArray(data)) setStages(data);
          })
          .catch((err) => console.error("Error reloading stages:", err));
      })
      .catch((err) => {
        console.error("Error confirming stage:", err);
        setConfirming(null);
      });
  };

  const handleReset = () => {
    if (!selectedProject) return;
    const currentToken = localStorage.getItem("token");
    fetch(`${API}/api/tracking/reset?project_id=${selectedProject.id}`, { method: "POST", headers: { Authorization: `Bearer ${currentToken}` } })
      .then(r => {
        if (!r.ok) throw new Error("Failed to reset");
        return r.json();
      })
      .then(() => {
        setProjectComplete(false);
        fetch(`${API}/api/tracking/stages?project_id=${selectedProject.id}`, { headers: { Authorization: `Bearer ${currentToken}` } })
          .then(r => {
            if (!r.ok) throw new Error("Failed to fetch stages");
            return r.json();
          })
          .then(data => {
            if (Array.isArray(data)) setStages(data);
          })
          .catch((err) => console.error("Error reloading stages:", err));
      })
      .catch((err) => console.error("Error resetting stages:", err));
  };

  // Progress calc
  const stagesArray = Array.isArray(stages) ? stages : [];
  const completedCount = stagesArray.filter(s => s.status === "completed").length;
  const progressPct = stagesArray.length > 0 ? Math.round((completedCount / stagesArray.length) * 100) : 0;

  if (!myId) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">กำลังโหลด...</div>;

  if (!selectedProject) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">ติดตามสถานะโครงการ</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">เลือกโครงการที่ต้องการติดตาม</p>
        </div>

        {loadingProjects ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-border border-dashed">
            <Building2 className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">ยังไม่มีโครงการที่ว่าจ้าง</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-3xl">
            {projects.map(p => {
              const isActive = p.status === "in_progress";
              return (
                <div
                  key={p.id}
                  onClick={() => { setSelectedProject(p); setProjectComplete(false); }}
                  className="bg-card border border-border hover:border-amber-500/50 rounded-2xl p-6 cursor-pointer transition-all group shadow-sm hover:shadow animate-fade-in"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-foreground font-bold text-lg group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {p.title}
                      </h3>
                      {p.quotation && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            p.quotation.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-border"
                          }`}>
                            📋 ใบเสนอราคา: {p.quotation.title}
                          </span>
                          <span className="text-xs text-slate-500">฿{p.quotation.amount.toLocaleString()}</span>
                        </div>
                      )}
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 line-clamp-1">{p.description}</p>
                    </div>
                    <span className={`ml-4 shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border ${
                      isActive 
                        ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/20" 
                        : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                    }`}>
                      {STATUS_BADGE[p.status] || p.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <User className="w-4 h-4 shrink-0" />
                      <span className="truncate">{p.contractor_name || "ยังไม่มีผู้รับเหมา"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <DollarSign className="w-4 h-4 shrink-0" />
                      <span>฿{p.budget.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>{p.end_date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Back & Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-foreground text-sm mb-3 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> กลับเลือกโครงการ
          </button>
          <h2 className="text-2xl font-bold text-foreground">{selectedProject.title}</h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{selectedProject.contractor_name}</span>
            <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" />฿{selectedProject.budget.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/employer/chat?contractorId=${selectedProject.contractor_id}`)}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm transition-colors border border-border cursor-pointer font-bold"
          >
            <MessageSquare className="w-4 h-4" /> แชทกับผู้รับเหมา
          </button>
          {projectComplete && (
            <button onClick={handleReset}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm transition-colors border border-border cursor-pointer font-bold">
              <RefreshCw className="w-4 h-4" /> รีเซ็ต
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">ความคืบหน้าโดยรวม</span>
          <span className="text-foreground font-bold">{progressPct}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>{completedCount}/{stagesArray.length} ขั้นตอน</span>
          <span>กำหนดส่ง {selectedProject.end_date}</span>
        </div>
      </div>

      {/* Project complete banner */}
      {projectComplete && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-6 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-500 mx-auto mb-3" />
          <h3 className="text-foreground font-bold text-xl mb-1">โครงการสำเร็จ! 🎉</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">ทุกขั้นตอนได้รับการยืนยันครบถ้วน</p>
        </div>
      )}

      {/* Project Images Gallery */}
      {stagesArray.some(s => s.proof_image_url) && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-3">📸 ภาพความคืบหน้า</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {stagesArray.filter(s => s.proof_image_url).flatMap(stage => 
              stage.proof_image_url!.split(",").map((url, idx) => ({
                id: `${stage.id}-${idx}`,
                url,
                stage_name: stage.stage_name
              }))
            ).map((imgObj) => (
              <div 
                key={imgObj.id} 
                className="relative group cursor-zoom-in"
                onClick={() => setActiveLightboxImage(getImageUrl(imgObj.url))}
              >
                <SafeImage
                  src={getImageUrl(imgObj.url)}
                  alt={imgObj.stage_name}
                  width={320}
                  height={180}
                  unoptimized
                  fallbackKind="image"
                  className="w-full h-32 object-cover rounded-xl border border-border group-hover:border-amber-500 transition-all"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-xl p-2">
                  <p className="text-white text-[10px] font-medium truncate">{imgObj.stage_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stages */}
      <div className="bg-card border border-border rounded-2xl p-8 relative overflow-hidden shadow-sm">
        <div className="absolute left-12 top-10 bottom-10 w-0.5 bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-8 relative z-10">
          {stagesArray.map((stage, index) => {
            const isActive      = stage.status === "active";
            const isDonePending = stage.status === "done_pending";
            const isCompleted   = stage.status === "completed";
            const isPending     = stage.status === "pending";

            return (
              <div key={stage.id} className={`flex items-start gap-6 ${isPending ? "opacity-50" : ""}`}>
                <div className={`mt-1 bg-card p-1 rounded-full relative z-10 ${
                  isCompleted   ? "text-emerald-600 dark:text-emerald-500" :
                  isDonePending ? "text-amber-600 dark:text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]" :
                  isActive      ? "text-blue-600 dark:text-blue-500" : "text-slate-500 dark:text-slate-600"
                }`}>
                  {isCompleted   ? <CheckCircle2 className="w-8 h-8" /> :
                   isDonePending ? <Clock className="w-8 h-8 animate-pulse" /> :
                   isActive      ? <Activity className="w-8 h-8" /> :
                   <div className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs font-bold">{index + 1}</div>}
                </div>

                <div className={`flex-1 border rounded-xl p-5 transition-all ${
                  isDonePending ? "border-amber-500/30 bg-amber-500/5" :
                  isCompleted   ? "border-emerald-500/20 bg-emerald-500/5" :
                  isActive      ? "border-blue-500/20 bg-blue-500/5" :
                  "border-border bg-slate-50 dark:bg-slate-950/40"
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`text-lg font-bold ${
                      isCompleted ? "text-emerald-700 dark:text-emerald-450" :
                      isDonePending ? "text-amber-700 dark:text-amber-450" :
                      isActive ? "text-blue-700 dark:text-blue-450" :
                      "text-slate-600 dark:text-slate-500"
                    }`}>{index + 1}. {stage.stage_name}</h3>

                    {isCompleted   && <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">ยืนยัน {stage.timestamp?.substring(0,10)}</span>}
                    {isDonePending && <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-1 rounded animate-pulse">รอการยืนยันจากคุณ</span>}
                    {isActive      && <span className="text-xs text-blue-700 dark:text-blue-400 bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-2 py-1 rounded">กำลังดำเนินการ</span>}
                  </div>

                  {/* Proof image */}
                  {(isDonePending || isCompleted) && stage.proof_image_url && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-1">หลักฐานจากผู้รับเหมา:</p>
                      <div className="flex gap-2 flex-wrap">
                        {stage.proof_image_url.split(",").map((url, idx) => (
                          <SafeImage key={idx} src={getImageUrl(url)} alt="หลักฐานการทำงาน"
                            width={160}
                            height={112}
                            unoptimized
                            fallbackKind="image"
                            onClick={() => setActiveLightboxImage(getImageUrl(url))}
                            className={`w-40 h-28 object-cover rounded-xl border hover:border-amber-500 hover:scale-[1.02] transition-all cursor-zoom-in ${isDonePending ? "border-amber-500/30" : "border-emerald-500/20 opacity-65"}`} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirm button */}
                  {isDonePending && (
                    <button
                      onClick={() => handleConfirm(stage.stage_name)}
                      disabled={confirming === stage.stage_name}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-850 disabled:text-slate-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors mt-2 cursor-pointer shadow-sm shadow-emerald-500/10"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {confirming === stage.stage_name ? "กำลังยืนยัน..." : "✅ ยืนยัน — งานเสร็จแล้ว"}
                    </button>
                  )}

                  {isActive && (
                    <p className="text-sm text-slate-600 dark:text-slate-500 mt-2">รอผู้รับเหมาทำงานและส่งหลักฐาน</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Lightbox Modal */}
      {activeLightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={() => setActiveLightboxImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-slate-300 bg-black/40 hover:bg-black/60 p-2.5 rounded-full transition-all cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setActiveLightboxImage(null); }}
          >
            <X className="w-6 h-6" />
          </button>
          <SafeImage
            src={activeLightboxImage} 
            alt="Enlarged view" 
            width={1600}
            height={1200}
            unoptimized
            fallbackKind="image"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
