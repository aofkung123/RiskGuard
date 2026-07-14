"use client";
import React, { useState, useEffect } from "react";
import {
  CheckCircle2, Activity, Clock, Upload,
  ArrowLeft, Calendar, DollarSign, User, MessageSquare, Image as ImageIcon, X
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
  owner_id: number;
  employer_name: string;
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

export default function ContractorTrackingPage() {
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

  const [projects, setProjects]               = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [stages, setStages]                   = useState<Stage[]>([]);
  const [uploadingFor, setUploadingFor]       = useState<string | null>(null);
  const [proofUrls, setProofUrls]             = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles]     = useState<File[]>([]);
  const [uploading, setUploading]             = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setProofUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Load projects
  useEffect(() => {
    if (!myId) return;
    fetch(`${API}/api/tracking/projects?user_id=${myId}&role=contractor`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setProjects(data); setLoadingProjects(false); })
      .catch(() => setLoadingProjects(false));
  }, [myId, API, token]);

  // Polling keeps authentication on every refresh; EventSource cannot send auth headers.
  useEffect(() => {
    if (!selectedProject) return;

    const fetchStages = () => {
      fetch(`${API}/api/tracking/stages?project_id=${selectedProject.id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(setStages)
        .catch(() => {});
    };
    fetchStages();

    const intervalId = setInterval(fetchStages, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [API, selectedProject, token]);

  const handleMarkDone = (stageName: string, imageUrl: string) => {
    if (!selectedProject) return;
    fetch(`${API}/api/tracking/update_stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        project_id: selectedProject.id,
        stage_name: stageName,
        status: "done_pending",
        proof_image_url: imageUrl || null,
      }),
    }).then(() => {
      setUploadingFor(null);
      setProofUrls([]);
      setSelectedFiles([]);
      fetch(`${API}/api/tracking/stages?project_id=${selectedProject.id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(setStages);
    });
  };

  const handleUploadAndSubmit = async (stageName: string, files: File[]) => {
    if (!selectedProject) return;
    setUploading(true);

    try {
      const urls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch(
          `${API}/api/tracking/upload_proof?project_id=${selectedProject.id}&stage_name=${encodeURIComponent(stageName)}`,
          { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData }
        );

        if (!uploadRes.ok) throw new Error("Upload failed");
        const { url } = await uploadRes.json();
        urls.push(url);
      }
      await handleMarkDone(stageName, urls.join(","));
    } catch {
      alert("อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setUploading(false);
    }
  };

  const completedCount = Array.isArray(stages) ? stages.filter(s => s.status === "completed").length : 0;
  const progressPct = (Array.isArray(stages) && stages.length > 0) ? Math.round((completedCount / stages.length) * 100) : 0;
  const allDone = Array.isArray(stages) && stages.length > 0 && stages.every(s => s.status === "completed");

  // ── PROJECT LIST ─────────────────────────────────────────────────────────────
  if (!myId) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">กำลังโหลด...</div>;

  if (!selectedProject) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">อัปเดตสถานะงาน</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">เลือกโครงการที่รับดูแลเพื่ออัปเดตความคืบหน้า</p>
        </div>

        {loadingProjects ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border border-dashed shadow-sm">
            <p className="text-slate-600 dark:text-slate-400">ยังไม่มีโครงการที่รับดูแล</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-3xl">
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedProject(p)}
                className="bg-card border border-border hover:border-blue-500/50 rounded-2xl p-6 cursor-pointer transition-all group shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground font-bold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
                    p.status === "in_progress"
                      ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/20"
                      : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                  }`}>
                    {STATUS_BADGE[p.status] || p.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <User className="w-4 h-4 shrink-0" />
                    <span className="truncate">{p.employer_name}</span>
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
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── STAGE DETAIL VIEW ────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-foreground text-sm mb-3 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> กลับเลือกโครงการ
          </button>
          <h2 className="text-2xl font-bold text-foreground">{selectedProject.title}</h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1"><User className="w-4 h-4" />{selectedProject.employer_name}</span>
            <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />฿{selectedProject.budget.toLocaleString()}</span>
          </div>
        </div>
        <button
          onClick={() => router.push(`/contractor/chat?employerId=${selectedProject.owner_id}`)}
          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm transition-colors border border-border cursor-pointer font-bold"
        >
          <MessageSquare className="w-4 h-4" /> แชทกับผู้ว่าจ้าง
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">ความคืบหน้า</span>
          <span className="text-foreground font-bold">{progressPct}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-450 font-medium">{completedCount}/{stages.length} ขั้นตอน · กำหนดส่ง {selectedProject.end_date}</div>
      </div>

      {/* Complete banner */}
      {allDone && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-500 mx-auto mb-3" />
          <h3 className="text-foreground font-bold text-xl mb-1">โครงการสำเร็จ! 🎉</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">ขอบคุณสำหรับการทำงาน</p>
        </div>
      )}

      {/* Stages */}
      <div className="bg-card border border-border rounded-2xl p-8 relative overflow-hidden shadow-sm">
        <div className="absolute left-12 top-10 bottom-10 w-0.5 bg-slate-100 dark:bg-slate-800" />
        <div className="space-y-8 relative z-10">
          {stages.map((stage, index) => {
            const isActive      = stage.status === "active";
            const isDonePending = stage.status === "done_pending";
            const isCompleted   = stage.status === "completed";
            const isPending     = stage.status === "pending";
            const isUploading   = uploadingFor === stage.stage_name;

            return (
              <div key={stage.id} className={`flex items-start gap-6 ${isPending ? "opacity-50" : ""}`}>
                <div className={`mt-1 bg-card p-1 rounded-full relative z-10 ${
                  isCompleted   ? "text-emerald-600 dark:text-emerald-500" :
                  isDonePending ? "text-amber-600 dark:text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]" :
                  isActive      ? "text-blue-600 dark:text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "text-slate-500 dark:text-slate-600"
                }`}>
                  {isCompleted   ? <CheckCircle2 className="w-8 h-8" /> :
                   isDonePending ? <Clock className="w-8 h-8 animate-pulse" /> :
                   isActive      ? <Activity className="w-8 h-8 animate-pulse" /> :
                   <div className="w-8 h-8 rounded-full border-2 border-slate-350 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs font-bold">{index + 1}</div>}
                </div>

                <div className={`flex-1 border rounded-xl p-5 transition-all ${
                  isActive      ? "border-blue-500/20 bg-blue-500/5" :
                  isDonePending ? "border-amber-500/20 bg-amber-500/5" :
                  isCompleted   ? "border-emerald-500/20 bg-emerald-500/5" :
                  "border-border bg-slate-50 dark:bg-slate-950/40"
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className={`text-lg font-bold ${
                      isCompleted ? "text-emerald-700 dark:text-emerald-450" :
                      isDonePending ? "text-amber-700 dark:text-amber-450" :
                      isActive ? "text-blue-700 dark:text-blue-450" : "text-slate-600 dark:text-slate-500"
                    }`}>{index + 1}. {stage.stage_name}</h3>

                    {isCompleted   && <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">เสร็จ {stage.timestamp?.substring(0,10)}</span>}
                    {isDonePending && <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-1 rounded animate-pulse">⏳ รอผู้ว่าจ้างยืนยัน</span>}
                    {isActive      && <span className="text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-2 py-1 rounded animate-pulse">กำลังดำเนินการ</span>}
                  </div>

                  {/* Proof preview if done_pending or completed */}
                  {(isDonePending || isCompleted) && stage.proof_image_url && (
                    <div className="mt-3 mb-3">
                      <p className="text-xs text-slate-500 mb-1">หลักฐานที่แนบไว้:</p>
                      <div className="flex gap-2 flex-wrap">
                        {stage.proof_image_url.split(",").map((url, idx) => (
                          <SafeImage key={idx} src={getImageUrl(url)} alt="หลักฐานการทำงาน"
                            width={128}
                            height={96}
                            unoptimized
                            fallbackKind="image"
                            onClick={() => setActiveLightboxImage(getImageUrl(url))}
                            className="w-32 h-24 object-cover rounded-lg border border-border hover:border-blue-500 hover:scale-[1.02] transition-all cursor-zoom-in" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active: upload form */}
                  {isActive && !isUploading && (
                    <button
                      onClick={() => setUploadingFor(stage.stage_name)}
                      className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-sm shadow-blue-500/10"
                    >
                      <Upload className="w-4 h-4" /> อัปโหลดรูปหลักฐานและส่งยืนยัน
                    </button>
                  )}

                  {isActive && isUploading && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <ImageIcon className="w-4 h-4" />
                        <span>เลือกรูปภาพหลักฐาน (ถ่ายจากหน้างาน)</span>
                      </div>

                      {/* File input */}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          setSelectedFiles(files);
                          const urls: string[] = [];
                          files.forEach(file => {
                            const reader = new FileReader();
                            reader.onload = ev => {
                              if (ev.target?.result) {
                                urls.push(ev.target.result as string);
                                if (urls.length === files.length) {
                                  setProofUrls(urls);
                                }
                              }
                            };
                            reader.readAsDataURL(file);
                          });
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2 text-foreground text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />

                      {proofUrls.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {proofUrls.map((url, idx) => (
                            <div key={idx} className="relative group w-32 h-24">
                              <SafeImage src={url} alt="ตัวอย่างหลักฐาน"
                                width={128}
                                height={96}
                                unoptimized
                                fallbackKind="image"
                                className="w-full h-full object-cover rounded-xl border border-border shadow-sm" />
                              <button 
                                type="button"
                                onClick={() => handleRemoveFile(idx)}
                                className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 shadow-md transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => selectedFiles.length > 0 && handleUploadAndSubmit(stage.stage_name, selectedFiles)}
                          disabled={selectedFiles.length === 0 || uploading}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer shadow-sm shadow-blue-500/10 disabled:cursor-not-allowed"
                        >
                          <Upload className="w-4 h-4" />
                          {uploading ? "กำลังอัปโหลด..." : "ส่งขอการยืนยัน"}
                        </button>
                        <button
                          onClick={() => { setUploadingFor(null); setProofUrls([]); setSelectedFiles([]); }}
                          className="flex items-center gap-1 text-slate-550 hover:text-foreground px-3 py-2 text-sm cursor-pointer"
                        >
                          <X className="w-4 h-4" /> ยกเลิก
                        </button>
                      </div>
                    </div>
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
            className="absolute top-4 right-4 text-white hover:text-slate-350 bg-black/40 hover:bg-black/60 p-2.5 rounded-full transition-all cursor-pointer"
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
