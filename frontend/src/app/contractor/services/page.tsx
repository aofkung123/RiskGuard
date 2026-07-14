"use client";
import React, { useCallback, useState, useEffect } from "react";
import { Plus, Trash2, Edit3, AlertCircle, Loader2 } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";

interface Service {
  id: string;
  portfolio_id: number;
  contractorId: number;
  title: string;
  category: string;
  startingPrice: number;
  location: string;
  coverImage: string;
  experienceYears: number;
  detailDescription: string;
}

const EMPTY_FORM = {
  title: "",
  category: "ก่อสร้างที่พักอาศัย",
  price: "",
  location: "กรุงเทพมหานคร",
  detail_description: "",
  experience_years: "5",
  image_url: "",
};

export default function ContractorServicesPage() {
  const [myId, setMyId] = useState<number | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [profileOk, setProfileOk] = useState(false);
  const [profileCheckDone, setProfileCheckDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Get current user from auth
  useEffect(() => {
    if (!token) { window.location.href = "/login"; return; }
    fetch(`${API}/api/profile/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.id) {
          setMyId(d.id);
          setProfileOk(!!d.profile_completed);
          setProfileCheckDone(true);
        } else {
          window.location.href = "/login";
        }
      })
      .catch(() => { localStorage.removeItem("token"); window.location.href = "/login"; });
  }, [API, token]);

  const contractorId = myId ?? 0;

  const fetchAll = useCallback(() => {
    if (!contractorId) return;
    fetch(`${API}/api/marketplace/services`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: Service[]) => {
        const mine = data.filter((s) => s.contractorId === contractorId);
        setServices(mine);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [API, contractorId, token]);

  useEffect(() => { if (contractorId) fetchAll(); }, [contractorId, fetchAll]);

  const openCreate = () => {
    setEditingService(null);
    setForm({ ...EMPTY_FORM });
    setIsModalOpen(true);
  };

  const openEdit = (srv: Service) => {
    setEditingService(srv);
    setForm({
      title: srv.title,
      category: srv.category,
      price: String(srv.startingPrice),
      location: srv.location,
      detail_description: srv.detailDescription || "",
      experience_years: String(srv.experienceYears || 5),
      image_url: srv.coverImage?.includes("unsplash") ? "" : srv.coverImage || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.price) return;
    setSubmitting(true);

    const payload = {
      contractor_id: contractorId,
      title: form.title,
      category: form.category,
      price: parseInt(form.price),
      location: form.location,
      detail_description: form.detail_description,
      experience_years: parseInt(form.experience_years),
      image_url: form.image_url.trim(),
    };

    let ok = false;
    let res: Response | null = null;
    if (editingService) {
      res = await fetch(`${API}/api/marketplace/services/${editingService.portfolio_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ service_id: editingService.portfolio_id, ...payload }),
      });
      ok = res.ok;
    } else {
      res = await fetch(`${API}/api/marketplace/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      ok = res.ok;
    }

    setSubmitting(false);
    if (ok) {
      closeModal();
      fetchAll();
    } else if (res) {
      const err = await res.json().catch(() => ({}));
      alert(err.detail || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  };

  const handleDelete = async (portfolioId: number) => {
    if (!confirm("ต้องการลบโพสต์นี้?")) return;
    const res = await fetch(`${API}/api/marketplace/services/${portfolioId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.detail || "ลบไม่สำเร็จ กรุณาลองใหม่");
    }
    fetchAll();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">บริการและผลงานของฉัน</h2>
          <p className="text-slate-600 dark:text-slate-400">จัดการโพสต์บริการเพื่อให้ผู้ว่าจ้างค้นหาเจอใน Marketplace</p>
        </div>
        {profileOk ? (
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold transition-colors cursor-pointer shadow-sm shadow-blue-500/10">
            <Plus className="w-5 h-5" /> สร้างโพสต์ใหม่
          </button>
        ) : (
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold">
            <AlertCircle className="w-4 h-4" /> กรอกโปรไฟล์ก่อนโพสงาน
          </div>
        )}
      </div>

      {/* Profile Warning */}
      {profileCheckDone && !profileOk && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0" />
          <div>
            <p className="text-amber-700 dark:text-amber-400 font-semibold text-sm">โปรไฟล์ยังไม่สมบูรณ์</p>
            <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">กรุณาไปที่หน้า &quot;โปรไฟล์&quot; กรอกเบอร์โทรและแนะนำตัวก่อน จึงจะสามารถโพสงานได้</p>
          </div>
        </div>
      )}

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border border-dashed shadow-sm">
          <Plus className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">ยังไม่มีบริการ</p>
          <p className="text-slate-500 dark:text-slate-450 text-sm mt-1">กดปุ่ม &quot;สร้างโพสต์ใหม่&quot; เพื่อเพิ่มบริการแรกของคุณ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(srv => (
            <div key={srv.id} className="bg-card border border-border rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-video relative">
                <SafeImage src={srv.coverImage} alt={srv.title} width={640} height={360} unoptimized fallbackKind="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-slate-900/80 text-blue-400 text-xs font-bold px-2 py-1 rounded">{srv.category}</div>
              </div>
              <div className="p-5">
                <h3 className="text-foreground font-bold text-base mb-1 line-clamp-2">{srv.title}</h3>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold mb-1">฿{srv.startingPrice.toLocaleString()}</p>
                <p className="text-slate-500 dark:text-slate-450 text-xs mb-4">{srv.location} · {srv.experienceYears} ปีประสบการณ์</p>
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={() => openEdit(srv)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-border text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer font-medium"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(srv.portfolio_id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-foreground">
                {editingService ? "แก้ไขโพสต์บริการ" : "สร้างโพสต์บริการใหม่"}
              </h3>
              <button onClick={closeModal} className="text-slate-500 hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">หัวข้อบริการ <span className="text-red-500">*</span></label>
                <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="เช่น รับสร้างบ้านสไตล์มินิมอล 2 ชั้น"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">หมวดหมู่งาน</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-blue-500">
                    <option>ก่อสร้างที่พักอาศัย</option>
                    <option>ต่อเติมและซ่อมแซม</option>
                    <option>อาคารสาธารณะ</option>
                    <option>ออกแบบภายใน</option>
                    <option>ทั่วไป</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">ราคาเริ่มต้น (บาท) <span className="text-red-500">*</span></label>
                  <input required type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                    placeholder="เช่น 150000"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">จังหวัดที่รับงาน</label>
                  <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">ประสบการณ์ (ปี)</label>
                  <input type="number" value={form.experience_years} onChange={e => setForm({...form, experience_years: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">URL รูปภาพผลงาน (Cover)</label>
                <input type="url" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-blue-500" />
                {form.image_url && (
                  <SafeImage src={form.image_url} alt="ตัวอย่างรูปบริการ" width={640} height={160} unoptimized fallbackKind="cover" className="mt-2 w-full h-32 object-cover rounded-lg border border-border" />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">รายละเอียดบริการ</label>
                <textarea value={form.detail_description} onChange={e => setForm({...form, detail_description: e.target.value})}
                  rows={3}
                  placeholder="อธิบายบริการ วัสดุที่ใช้ ขอบเขตงาน รับประกัน..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-blue-500 resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2.5 border border-border text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-medium">
                  ยกเลิก
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-500/10">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</> : (editingService ? "บันทึกการแก้ไข" : "โพสต์บริการ")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
