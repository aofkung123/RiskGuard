"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield, BarChart3, MessageSquare, Search, HardHat,
  TrendingUp, AlertTriangle, CheckCircle, ArrowRight, DollarSign,
  Package, Zap, Clock, Sun, Moon
} from 'lucide-react';
import { applyTheme, getInitialTheme, persistTheme, type AppTheme } from '@/lib/theme';

export default function LandingPage() {
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    persistTheme(next);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Ambient background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[128px] dark:opacity-30 opacity-20" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px] dark:opacity-30 opacity-20" />
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 p-2 rounded-xl">
              <Shield className="w-5 h-5 text-slate-900" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">RiskGuard</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-border bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-all cursor-pointer"
              title={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500 animate-pulse" /> : <Moon className="w-4 h-4 text-blue-500" />}
            </button>

            <Link href="/login" className="text-sm font-semibold hover:text-amber-500 transition-colors text-slate-700 dark:text-slate-200">
              เข้าสู่ระบบ
            </Link>
            <Link href="/register" className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-amber-500/10">
              เริ่มต้นใช้งาน
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero & Dual Entry Section ──────────────────────────────── */}
      <header className="relative pt-32 pb-16 overflow-hidden">
        <div className="container mx-auto px-6 text-center max-w-6xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-8 animate-fade-in">
            <Zap className="w-3.5 h-3.5" />
            <span>แพลตฟอร์มบริหารความเสี่ยงงานก่อสร้าง</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight text-foreground">
            บริหาร <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">ต้นทุนและเวลา</span> <br />
            อย่างมีประสิทธิภาพ
          </h1>
          <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-300 text-base md:text-lg mb-12 leading-relaxed">
            ระบบจัดเก็บข้อมูลแบบ Real-time ช่วยผู้รับเหมาและผู้ว่าจ้างเห็นสถานะทางการเงิน 
            พร้อมระบบ Early Warning ประเมินความเบี่ยงเบนของโครงการก่อสร้าง
          </p>

          {/* ── Role Separation Section ─────────────────────────────── */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-6 text-left">
            
            {/* Employer Panel */}
            <div className="relative group bg-card hover:bg-card border border-border rounded-3xl p-8 transition-all duration-300 hover:scale-[1.02] shadow-xl hover:shadow-amber-500/5 hover:border-amber-500/40">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full rounded-tr-3xl group-hover:bg-amber-500/10 transition-colors" />
              
              <div className="w-12 h-12 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-foreground mb-3">ทางเข้าผู้ว่าจ้าง (Employer)</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
                สำหรับเจ้าของโครงการหรือผู้จ้างงาน ต้องการควบคุมงบประมาณ ค้นหาผู้รับเหมา และดูแลภาพรวมความปลอดภัยของเงินลงทุน
              </p>

              <div className="space-y-3 mb-8">
                {[
                  'ค้นหาผู้รับเหมาตามจัดอันดับและบริการจริง',
                  'แผงควบคุมสถานะโครงการ EVM (CPI/SPI)',
                  'ระบบแชทโปร่งใส ส่งพิมพ์เขียว และอนุมัติราคา',
                  'ระบบ Early Warning แจ้งเตือนงบบานปลายล่วงหน้า'
                ].map((feat, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-700 dark:text-slate-200">
                    <CheckCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/login"
                onClick={() => localStorage.setItem('role', 'employer')}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 py-3.5 px-4 rounded-xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
              >
                เข้าใช้งานพอร์ทัลผู้ว่าจ้าง <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Contractor Panel */}
            <div className="relative group bg-card hover:bg-card border border-border rounded-3xl p-8 transition-all duration-300 hover:scale-[1.02] shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/40">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full rounded-tr-3xl group-hover:bg-blue-500/10 transition-colors" />
              
              <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
                <HardHat className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-foreground mb-3">ทางเข้าผู้รับเหมา (Contractor)</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
                สำหรับบริษัทรับเหมา ทีมงานวิศวกร หรือช่างอาชีพที่ต้องการประมาณการราคา รายงานสถานะความคืบหน้าโครงการ และส่งใบเสนอราคา
              </p>

              <div className="space-y-3 mb-8">
                {[
                  'จัดทำใบประมาณราคากลางอ้างอิงจากคลังวัสดุ DW',
                  'รายงานสถานะโครงการและรูปภาพรายวัน',
                  'วิเคราะห์ส่วนเบี่ยงเบนต้นทุน-เวลาผ่าน CPI/SPI',
                  'โปรไฟล์จัดเก็บ Portfolio สร้างความน่าเชื่อถือ'
                ].map((feat, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-700 dark:text-slate-200">
                    <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/login"
                onClick={() => localStorage.setItem('role', 'contractor')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 px-4 rounded-xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
              >
                เข้าใช้งานพอร์ทัลผู้รับเหมา <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        </div>
      </header>

      {/* ── Problem & Solution ────────────────────────────────────── */}
      <section className="py-20 bg-slate-100/50 dark:bg-slate-900/20 border-y border-border">
        <div className="container mx-auto px-6 max-w-5xl">
          {/* Header Grid */}
          <div className="grid md:grid-cols-2 gap-x-12 mb-8">
            {/* Problem Header */}
            <div className="mb-6 md:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 mb-6">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>ปัญหาที่พบบ่อย</span>
              </div>
              <h2 className="text-3xl font-extrabold text-foreground leading-tight">โครงการก่อสร้างทั่วไป มักพบปัญหายืดเยื้อ</h2>
            </div>

            {/* Solution Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-6">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>คำตอบจาก RiskGuard</span>
              </div>
              <h2 className="text-3xl font-extrabold text-foreground leading-tight">วิเคราะห์ ล่วงหน้า ควบคุม ทุกปัจจัยเสี่ยง</h2>
            </div>
          </div>

          {/* Cards Grid (Perfectly Aligned Rows) */}
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
            {[
              {
                prob: { icon: Clock, text: 'งานล่าช้าสะสมโดยไม่รู้ตัวจนถึงวันส่งมอบ' },
                sol: { icon: BarChart3, text: 'ดัชนี CPI และ SPI รายงานสถานะความก้าวหน้าโครงการแบบเรียลไทม์' }
              },
              {
                prob: { icon: DollarSign, text: 'งบประมาณบานปลายแบบไม่มีข้อมูลเปรียบเทียบตลาด' },
                sol: { icon: Package, text: 'Data Warehouse ดึงราคากลางเปรียบเทียบตลาดทันที' }
              },
              {
                prob: { icon: MessageSquare, text: 'ผู้ว่าจ้างและผู้รับเหมาขาดการสื่อสารที่โปร่งใส' },
                sol: { icon: MessageSquare, text: 'ระบบเก็บประวัติสนทนา ใบเสนอราคา และไฟล์สัญญาอย่างเป็นระบบ' }
              },
              {
                prob: { icon: Search, text: 'ราคาวัสดุมีความผันผวนสูง ขาดแหล่งอ้างอิงกลาง' },
                sol: { icon: AlertTriangle, text: 'Early Warning ตรวจจับสัญญานเตือนภัยก่อนสายเกินแก้' }
              }
            ].map((pair, i) => {
              const ProbIcon = pair.prob.icon;
              const SolIcon = pair.sol.icon;
              return (
                <React.Fragment key={i}>
                  {/* Problem Card (Left) */}
                  <div className="flex items-center gap-4 p-5 bg-red-50/90 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl shadow-sm transition-all duration-300 hover:scale-[1.01] hover:border-red-300 dark:hover:border-red-800/40">
                    <div className="p-2.5 bg-red-100/80 dark:bg-red-900/40 rounded-xl shrink-0">
                      <ProbIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold leading-relaxed">{pair.prob.text}</p>
                  </div>

                  {/* Solution Card (Right) */}
                  <div className="flex items-center gap-4 p-5 bg-emerald-50/90 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl shadow-sm transition-all duration-300 hover:scale-[1.01] hover:border-emerald-300 dark:hover:border-emerald-800/40">
                    <div className="p-2.5 bg-emerald-100/80 dark:bg-emerald-900/40 rounded-xl shrink-0">
                      <SolIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold leading-relaxed">{pair.sol.text}</p>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── EVM Metrics Explained ──────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-foreground mb-4">ตัวชี้วัดความมั่นคงของโครงการ (EVM)</h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base">
              เราใช้หลักการ Earned Value Management (EVM) เพื่อคำนวณความเสี่ยงของโครงการอย่างมีมาตรฐาน
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BarChart3, colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
                title: 'CPI — Cost Performance Index', subtitle: 'ดัชนีประสิทธิภาพต้นทุน',
                formula: 'CPI = EV / AC',
                good: '≥ 1.0 → อยู่ในงบประมาณ', warn: '< 0.95 → เริ่มมีความเสี่ยง', critical: '< 0.85 → วิกฤตงบเกิน',
              },
              {
                icon: Clock, colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
                title: 'SPI — Schedule Performance Index', subtitle: 'ดัชนีประสิทธิภาพเวลา',
                formula: 'SPI = EV / PV',
                good: '≥ 1.0 → การทำงานตรงตามแผน', warn: '< 0.95 → เริ่มล่าช้าสะสม', critical: '< 0.85 → วิกฤตล่าช้ามาก',
              },
              {
                icon: TrendingUp, colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
                title: 'Variance — ค่าความเบี่ยงเบน', subtitle: 'ส่วนต่างระหว่างแผนกับจริง',
                formula: 'Variance = Actual − Planned',
                good: '≤ ±10% → ปกติไม่มีปัญหา', warn: '10–15% → ควรได้รับการเฝ้าระวัง', critical: '> 15% → วิกฤตต้องแก้ไขด่วน',
              },
            ].map((m) => (
              <div key={m.title} className="bg-card border border-border rounded-3xl p-8 hover:shadow-lg transition-all duration-300">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${m.colorClass}`}>
                  <m.icon className="w-6 h-6" />
                </div>
                <h3 className="text-foreground font-bold text-lg mb-1">{m.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-5 font-semibold">{m.subtitle}</p>
                
                <div className="bg-background/80 rounded-2xl p-4 border border-border mb-6">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold tracking-wider">สูตรคำนวณ</p>
                  <p className="text-amber-500 dark:text-amber-400 font-mono font-bold text-sm">{m.formula}</p>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">{m.good}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">{m.warn}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">{m.critical}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-100/50 dark:bg-slate-900/20 border-t border-border">
        <div className="container mx-auto px-6 text-center max-w-4xl">
          <div className="bg-card border border-border rounded-3xl p-12 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-blue-500" />
            <Zap className="w-10 h-10 text-amber-500 mx-auto mb-6" />
            <h2 className="text-3xl font-extrabold text-foreground mb-4">พร้อมที่จะร่วมมือดูแลความปลอดภัยของโครงการหรือยัง?</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
              เปิดโอกาสให้ผู้ว่าจ้างและผู้รับเหมาทำงานร่วมกันอย่างเข้าใจ มีประสิทธิภาพ และโปร่งใสมากยิ่งขึ้น ด้วยระบบ RiskGuard
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-8 py-4 rounded-xl text-base font-bold transition-all shadow-md shadow-amber-500/10">
                สมัครใช้งานพอร์ทัลฟรี
              </Link>
              <Link href="/login" className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground px-8 py-4 rounded-xl text-base font-bold transition-all border border-border">
                เข้าสู่ระบบใช้งาน
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="py-12 border-t border-border bg-card">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 max-w-5xl">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-foreground">RiskGuard</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-xs">
            © 2026 RiskGuard Construction Technologies. สงวนลิขสิทธิ์
          </p>
          <div className="flex gap-6 text-slate-600 dark:text-slate-400 text-xs font-semibold">
            <a href="#" className="hover:text-amber-500 transition-colors">นโยบายความเป็นส่วนตัว</a>
            <a href="#" className="hover:text-amber-500 transition-colors">ข้อกำหนดการใช้งาน</a>
            <a href="#" className="hover:text-amber-500 transition-colors">ติดต่อเรา</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
