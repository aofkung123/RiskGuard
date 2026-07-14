"use client";
import React, { useState } from 'react';
import { Shield, Mail, Lock, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { apiRequest, errorMessage, saveSession, type UserRole } from '@/lib/api';

interface LoginResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  user_id: number;
  full_name: string;
  email: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'employer' | 'contractor'>('employer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = await apiRequest<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      saveSession(data.access_token, data.role, {
        id: data.user_id,
        full_name: data.full_name,
        email: data.email,
      });
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setError(errorMessage(err, 'การเข้าสู่ระบบล้มเหลว'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div className={`p-2.5 rounded-2xl group-hover:scale-110 transition-all shadow-md ${
              role === 'employer' 
                ? 'bg-teal-700 text-white shadow-teal-900/10' 
                : 'bg-indigo-600 text-white shadow-indigo-900/10'
            }`}>
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-foreground transition-colors">RiskGuard</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">ยินดีต้อนรับกลับมา</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">เข้าสู่ระบบเพื่อจัดการโครงการก่อสร้างอย่างเป็นระบบ</p>
        </div>

        <div className="bg-card border border-border p-8 rounded-2xl shadow-sm">
          {/* Role Selection Tabs */}
          <div className="flex bg-stone-100 dark:bg-slate-950 p-1.5 rounded-xl mb-6 border border-border/40">
            <button
              type="button"
              onClick={() => setRole('employer')}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                role === 'employer' 
                  ? 'bg-teal-700 text-white shadow-sm font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              ผู้ว่าจ้าง (Employer)
            </button>
            <button
              type="button"
              onClick={() => setRole('contractor')}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                role === 'contractor' 
                  ? 'bg-indigo-600 text-white shadow-sm font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              ผู้รับเหมา (Contractor)
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="flex gap-2.5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-650 dark:text-red-400 text-sm font-medium" role="alert">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">อีเมล</label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors ${
                  role === 'employer' ? 'group-focus-within:text-teal-600' : 'group-focus-within:text-indigo-500'
                }`} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={`w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-xl py-3.5 pl-12 pr-4 text-foreground text-sm transition-all outline-none ${
                    role === 'employer' 
                      ? 'focus:ring-2 focus:ring-teal-600/15 focus:border-teal-600' 
                      : 'focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">รหัสผ่าน</label>
                <a href="#" className={`text-xs font-bold transition-colors ${
                  role === 'employer' ? 'text-teal-700 hover:text-teal-600 dark:text-teal-300 dark:hover:text-teal-200' : 'text-indigo-700 hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200'
                }`}>ลืมรหัสผ่าน?</a>
              </div>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors ${
                  role === 'employer' ? 'group-focus-within:text-teal-600' : 'group-focus-within:text-indigo-500'
                }`} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-xl py-3.5 pl-12 pr-4 text-foreground text-sm transition-all outline-none ${
                    role === 'employer' 
                      ? 'focus:ring-2 focus:ring-teal-600/15 focus:border-teal-600' 
                      : 'focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600'
                  }`}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md ${
                role === 'employer' 
                  ? 'bg-teal-700 text-white hover:bg-teal-600 shadow-teal-900/10' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/10'
              }`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>เข้าสู่ระบบ <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-border text-center">
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              ยังไม่มีบัญชีใช่ไหม? {' '}
              <Link href="/register" className={`font-bold transition-colors ${role === 'employer' ? 'text-teal-700 hover:text-teal-600 dark:text-teal-300 dark:hover:text-teal-200' : 'text-indigo-700 hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200'}`}>
                สมัครสมาชิกที่นี่
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
