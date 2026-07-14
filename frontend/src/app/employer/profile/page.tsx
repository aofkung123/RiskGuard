"use client";
import React, { useState, useEffect } from "react";
import { User, Save, CheckCircle2, AlertTriangle } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";
import { apiRequest, fetchCurrentUser, type CurrentUser } from "@/lib/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    phone: "", address: "", bio: "", avatar_url: "", company_name: "", tax_id: ""
  });

  useEffect(() => {
    fetchCurrentUser()
      .then(data => {
        if (!data) {
          window.location.href = "/login";
          return;
        }
        setProfile(data);
        setForm({
          phone: data.phone || "",
          address: data.address || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          company_name: data.company_name || "",
          tax_id: data.tax_id || "",
        });
        setLoading(false);
      })
      .catch(() => {
        window.location.href = "/login";
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    await apiRequest('/api/profile/update', {
      method: "POST",
      body: JSON.stringify({ user_id: profile.id, ...form }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    // Refresh
    const refreshed = await fetchCurrentUser();
    if (refreshed) setProfile(refreshed);
  };

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">กำลังโหลด...</div>;

  const isContractor = profile?.role === "contractor";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">โปรไฟล์ของฉัน</h2>
        <p className="text-slate-600 dark:text-slate-400">ตั้งค่าข้อมูลส่วนตัวเพื่อใช้งานระบบได้อย่างเต็มประสิทธิภาพ</p>
      </div>

      {/* Profile Status Banner */}
      {!profile?.profile_completed && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0" />
          <div>
            <p className="text-amber-700 dark:text-amber-400 font-semibold text-sm">โปรไฟล์ยังไม่สมบูรณ์</p>
            <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
              {isContractor ? "กรุณากรอกข้อมูลให้ครบก่อนโพสงานบริการ" : "กรุณากรอกข้อมูลให้ครบก่อนว่าจ้างผู้รับเหมา"}
            </p>
          </div>
        </div>
      )}
      {profile?.profile_completed && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
          <p className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm">โปรไฟล์สมบูรณ์ ✨ คุณพร้อมใช้งานระบบเต็มรูปแบบ</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
        {/* Avatar */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <SafeImage
              src={form.avatar_url}
              alt="avatar"
              width={80}
              height={80}
              unoptimized
              fallbackKind="avatar"
              className="w-20 h-20 rounded-full border-2 border-border object-cover"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-slate-900" />
            </div>
          </div>
          <div>
            <h3 className="text-foreground font-bold text-xl">{profile?.full_name}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{profile?.email}</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${isContractor ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-750 dark:text-blue-400" : "bg-amber-500/10 dark:bg-amber-500/20 text-amber-750 dark:text-amber-400"}`}>
              {isContractor ? "ผู้รับเหมา" : "ผู้ว่าจ้าง"}
            </span>
          </div>
        </div>

        <hr className="border-border" />

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
            <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              placeholder="0xx-xxx-xxxx"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-500 transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">ชื่อบริษัท / ร้านค้า</label>
            <input type="text" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})}
              placeholder="เช่น บริษัท รับสร้างบ้าน จำกัด"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-500 transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">เลขประจำตัวผู้เสียภาษี (ถ้ามี)</label>
            <input type="text" value={form.tax_id} onChange={e => setForm({...form, tax_id: e.target.value})}
              placeholder="13 หลัก"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-500 transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">URL รูปโปรไฟล์</label>
            <input type="url" value={form.avatar_url} onChange={e => setForm({...form, avatar_url: e.target.value})}
              placeholder="https://..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-500 transition-colors" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">ที่อยู่</label>
            <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})}
              placeholder="ที่อยู่ / จังหวัด"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-500 transition-colors" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">แนะนำตัว / รายละเอียดเพิ่มเติม <span className="text-red-500">*</span></label>
            <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
              rows={4}
              placeholder={isContractor ? "เล่าประสบการณ์ ทักษะ และผลงานที่ผ่านมา..." : "แนะนำตัวของ และประเภทงานที่ต้องการว่าจ้าง..."}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-amber-500 transition-colors resize-none" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-slate-900 font-bold px-6 py-2.5 rounded-xl transition-colors cursor-pointer shadow-md shadow-amber-500/10"
          >
            {saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {saving ? "กำลังบันทึก..." : saved ? "บันทึกแล้ว!" : "บันทึกโปรไฟล์"}
          </button>
        </div>
      </div>
    </div>
  );
}
