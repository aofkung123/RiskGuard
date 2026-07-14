"use client";
import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Plus, MapPin, Calendar, MoreHorizontal, Loader2, X } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface Project {
  id: number;
  title: string;
  description: string;
  budget: number;
  status: string;
  start_date: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', budget: '', start_date: '', end_date: '' });
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<'employer' | 'contractor'>('employer');
  const [error, setError] = useState('');
  const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');

  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

  const loadProjects = useCallback(() => {
    if (!token) return;
    apiRequest<Project[]>('/api/projects/')
      .then((data) => setProjects(data || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) { window.location.href = "/login"; return; }
    // Verify role
    fetch(`${API}/api/profile/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d?.role !== 'employer' && d?.role !== 'contractor') { window.location.href = "/"; return; }
        setRole(d.role);
        loadProjects();
      });
  }, [API, loadProjects, token]);

  const handleCreate = async () => {
    if (!form.title || !form.budget) { setError("กรุณากรอกข้อมูลให้ครบ"); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/projects/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, budget: Number(form.budget), status: "planning" }),
      });
      if (!res.ok) throw new Error("สร้างโครงการไม่สำเร็จ");
      setShowModal(false);
      setForm({ title: '', description: '', budget: '', start_date: '', end_date: '' });
      loadProjects();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DashboardLayout userRole={role}>
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">โครงการก่อสร้าง</h1>
              <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">จัดการและติดตามสถานะงานโครงการทั้งหมดของคุณ</p>
            </div>
            {role === 'employer' && (
              <button onClick={() => setShowModal(true)} className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-500/10 cursor-pointer self-start sm:self-auto">
                <Plus className="w-5 h-5" /> สร้างโครงการใหม่
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-3xl border border-border">
              <p className="text-slate-550 dark:text-slate-400">ไม่พบโครงการในระบบ เริ่มต้นสร้างโครงการแรกของคุณได้เลย!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="bg-card border border-border rounded-3xl p-6 hover:border-amber-500/50 transition-all group shadow-sm hover:shadow-md">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-amber-550/10 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                      <Plus className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <button className="text-slate-400 hover:text-foreground transition-colors cursor-pointer">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{project.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-550 dark:text-slate-400 mb-6">
                    <MapPin className="w-4 h-4 shrink-0" /> {project.description || 'ไม่ได้ระบุสถานที่'}
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">งบประมาณโครงการ</span>
                      <span className="font-extrabold text-foreground">฿{project.budget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="w-4 h-4" /> {new Date(project.start_date).toLocaleDateString('th-TH')}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        project.status === 'planning' 
                          ? 'bg-blue-500/10 text-blue-650 dark:text-blue-400 border border-blue-500/20' 
                          : 'bg-emerald-500/10 text-emerald-750 dark:text-emerald-450 border border-emerald-500/20'
                      }`}>
                        {project.status === 'planning' ? 'รอดำเนินการ' : 'กำลังดำเนินการ'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">สร้างโครงการใหม่</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">ชื่อโครงการ *</label>
                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">รายละเอียด / สถานที่</label>
                <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">งบประมาณ (บาท) *</label>
                <input type="number" value={form.budget} onChange={e => setForm(f => ({...f, budget: e.target.value}))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">วันเริ่ม</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">กำหนดส่ง</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-amber-500" />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button onClick={handleCreate} disabled={submitting}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-300 text-slate-900 font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed">
                {submitting ? "กำลังสร้าง..." : "สร้างโครงการ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
