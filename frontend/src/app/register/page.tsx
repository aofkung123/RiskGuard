"use client";
import React, { useState } from 'react';
import { Shield, Mail, Lock, User, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { errorMessage, getApiBase, type UserRole } from '@/lib/api';

interface RegisterForm {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterForm>({
    email: '',
    password: '',
    full_name: '',
    role: 'employer'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (formData.password.length < 8) {
        throw new Error('รหัสผ่านควรมีอย่างน้อย 8 ตัวอักษร');
      }

      const res = await fetch(`${getApiBase()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'ลงทะเบียนไม่สำเร็จ');

      // Auto-login after register
      const loginRes = await fetch(`${getApiBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error('ลงทะเบียนสำเร็จแต่เข้าสู่ระบบไม่ได้ กรุณาเข้าสู่ระบบด้วยตนเอง');

      // Save session
      const { saveSession, roleHomePath } = await import('@/lib/api');
      saveSession(loginData.access_token, loginData.role, {
        id: loginData.user_id,
        full_name: loginData.full_name,
        email: loginData.email,
      });
      setSuccess(true);
      window.location.href = roleHomePath(loginData.role);
    } catch (err: unknown) {
      setError(errorMessage(err, 'การลงทะเบียนล้มเหลว'));
    } finally {
      setLoading(false);
    }
  };

  const isEmployer = formData.role === 'employer';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div className={`p-2.5 rounded-2xl group-hover:scale-110 transition-all shadow-md ${
              isEmployer 
                ? 'bg-teal-700 text-white shadow-teal-900/10' 
                : 'bg-indigo-600 text-white shadow-indigo-900/10'
            }`}>
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-foreground transition-colors">RiskGuard</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">สร้างบัญชีผู้ใช้</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">เริ่มใช้งานแพลตฟอร์มบริหารโครงการก่อสร้าง</p>
        </div>

        <div className="bg-card border border-border p-8 rounded-2xl shadow-sm">
          {success ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-20 h-20 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Shield className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-foreground">สร้างบัญชีสำเร็จ!</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">กำลังพาท่านไปยังหน้าเข้าสู่ระบบ...</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              {error && (
                <div className="flex gap-2.5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-650 dark:text-red-400 text-sm font-medium" role="alert">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">ชื่อ-นามสกุล</label>
                <div className="relative group">
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors ${
                    isEmployer ? 'group-focus-within:text-teal-600' : 'group-focus-within:text-indigo-500'
                  }`} />
                  <input 
                    type="text" 
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder="สมชาย รักดี"
                    className={`w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-xl py-3.5 pl-12 pr-4 text-foreground text-sm transition-all outline-none ${
                      isEmployer 
                        ? 'focus:ring-2 focus:ring-teal-600/15 focus:border-teal-600' 
                        : 'focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">อีเมล</label>
                <div className="relative group">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors ${
                    isEmployer ? 'group-focus-within:text-teal-600' : 'group-focus-within:text-indigo-500'
                  }`} />
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="name@company.com"
                    className={`w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-xl py-3.5 pl-12 pr-4 text-foreground text-sm transition-all outline-none ${
                      isEmployer 
                        ? 'focus:ring-2 focus:ring-teal-600/15 focus:border-teal-600' 
                        : 'focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">รหัสผ่าน</label>
                <div className="relative group">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors ${
                    isEmployer ? 'group-focus-within:text-teal-600' : 'group-focus-within:text-indigo-500'
                  }`} />
                  <input 
                    type="password" 
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className={`w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-xl py-3.5 pl-12 pr-4 text-foreground text-sm transition-all outline-none ${
                      isEmployer 
                        ? 'focus:ring-2 focus:ring-teal-600/15 focus:border-teal-600' 
                        : 'focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">ฉันเป็น...</label>
                <div className="grid grid-cols-3 gap-4">
                  {([
                    { id: 'employer', label: 'ผู้ว่าจ้าง', color: 'amber' },
                    { id: 'contractor', label: 'ผู้รับเหมา', color: 'blue' },
                    { id: 'group_ceo', label: 'Group CEO', color: 'violet' }
                  ] as const).map((r) => {
                    const isActive = formData.role === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setFormData({...formData, role: r.id})}
                        className={`py-3.5 rounded-xl border text-sm font-extrabold transition-all cursor-pointer ${
                          isActive
                            ? r.id === 'employer'
                              ? 'bg-teal-700 border-teal-700 text-white shadow-sm shadow-teal-900/10'
                            : r.id === 'contractor'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-900/10'
                            : 'bg-violet-600 border-violet-600 text-white shadow-sm shadow-violet-600/10'
                            : 'bg-slate-50 dark:bg-slate-950/60 border border-border text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-800'
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 mt-6 cursor-pointer shadow-md ${
                  isEmployer 
                    ? 'bg-teal-700 text-white hover:bg-teal-600 shadow-teal-900/10' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/10'
                }`}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>ลงทะเบียน <ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-border text-center">
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              มีบัญชีอยู่แล้วใช่ไหม? {' '}
              <Link href="/login" className={`font-bold transition-colors ${
                isEmployer ? 'text-teal-700 hover:text-teal-600 dark:text-teal-300 dark:hover:text-teal-200' : 'text-indigo-700 hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200'
              }`}>
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
