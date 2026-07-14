"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calculator, Box, Ruler, Info, RefreshCw, TrendingDown, TrendingUp, AlertCircle, RotateCcw } from 'lucide-react';
import { apiRequest, errorMessage } from '@/lib/api';

interface MaterialPrice {
  category_name: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  median_price?: number;
  q25_price?: number;
  items_count: number;
  best_source: string;
  price_per_unit?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  Steel:  { bg: 'bg-slate-800/50',   border: 'border-slate-700',  text: 'text-slate-300', badge: 'bg-blue-500/20 text-blue-400' },
  Cement: { bg: 'bg-slate-800/50',   border: 'border-slate-700',  text: 'text-slate-300', badge: 'bg-gray-500/20 text-gray-400' },
  Bricks: { bg: 'bg-amber-500/10',   border: 'border-amber-500/30', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-400' },
  Wood:   { bg: 'bg-green-500/10',   border: 'border-green-500/30',  text: 'text-green-300',  badge: 'bg-green-500/20 text-green-400' },
  Stone:  { bg: 'bg-stone-500/10',  border: 'border-stone-500/30',  text: 'text-stone-300', badge: 'bg-stone-500/20 text-stone-400' },
};

export default function ConstructionCalculator() {
  const [width, setWidth] = useState(5);
  const [height, setHeight] = useState(3);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quantityOverrides, setQuantityOverrides] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<MaterialPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);

  const API = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`)
    : 'http://localhost:8000';
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

  const area = width * height;

  // Fetch real prices from backend (synced from DW)
  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<MaterialPrice[]>('/api/materials/calculator-prices');
      setPrices(data);
      setLastSync(new Date().toLocaleString('th-TH'));
      setError(data.length === 0 ? 'ยังไม่มีข้อมูลวัสดุ กรุณากดซิงค์จาก DW เพื่อดึงราคาล่าสุด' : null);
    } catch (err: unknown) {
      setError(errorMessage(err, 'ไม่สามารถดึงข้อมูลราคาได้'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger ETL sync from DW
  const triggerSync = async () => {
    setSyncing(true);
    try {
      await apiRequest('/api/materials/sync-from-dw', { method: 'POST' });
      await fetchPrices();
    } catch {
      setError('Sync ล้มเหลว กรุณาลองใหม่');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchPrices);
  }, [fetchPrices]);

  const updateQty = (cat: string, val: number) => {
    setQuantityOverrides(prev => ({ ...prev, [cat]: Math.max(0, val) }));
  };

  const getQty = useCallback((cat: string) => quantityOverrides[cat] ?? area, [area, quantityOverrides]);

  const filteredPrices = useMemo(() => (
    selectedCategory === 'all' ? prices : prices.filter(p => p.category_name === selectedCategory)
  ), [prices, selectedCategory]);

  const grandTotal = useMemo(() => filteredPrices.reduce((sum, p) => (
    sum + getQty(p.category_name) * p.avg_price
  ), 0), [filteredPrices, getQty]);

  const lowestTotal = useMemo(() => filteredPrices.reduce((sum, p) => (
    sum + getQty(p.category_name) * p.min_price
  ), 0), [filteredPrices, getQty]);

  const highestTotal = useMemo(() => filteredPrices.reduce((sum, p) => (
    sum + getQty(p.category_name) * p.max_price
  ), 0), [filteredPrices, getQty]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-amber-500/20 p-3 rounded-2xl animate-pulse">
            <Calculator className="w-8 h-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <div className="h-8 w-80 bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-4 w-96 bg-slate-800/50 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-slate-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500/20 p-3 rounded-2xl">
            <Calculator className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">เครื่องมือคำนวณต้นทุนงานก่อสร้าง</h1>
            <p className="text-slate-400">
              ประมาณการงบประมาณอ้างอิงราคาตลาดจริงจาก Data Warehouse
              {lastSync && <span className="ml-2 text-amber-500/60">· อัปเดต {lastSync}</span>}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            onClick={() => setQuantityOverrides({})}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-400 hover:text-white transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            รีเซ็ตปริมาณ
          </button>
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-400 hover:text-amber-500 hover:border-amber-500/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'กำลังซิงค์...' : 'ซิงค์จาก DW'}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
          <button
            onClick={() => void fetchPrices()}
            className="ml-auto text-sm underline hover:no-underline"
          >
            ลองใหม่
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Area + Category Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8">
            {/* Area inputs */}
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">ขนาดพื้นที่</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Ruler className="w-4 h-4" /> ความกว้าง (เมตร)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={width}
                    onChange={(e) => setWidth(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Ruler className="w-4 h-4 rotate-90" /> ความยาว (เมตร)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={height}
                    onChange={(e) => setHeight(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                พื้นที่ทั้งหมด: <span className="text-amber-500 font-bold">{area.toLocaleString()} ตร.ม.</span>
              </p>
            </div>

            {/* Category filter */}
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">กรองหมวดหมู่วัสดุ</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  ทั้งหมด ({prices.length})
                </button>
                {prices.map(p => (
                  <button
                    key={p.category_name}
                    onClick={() => setSelectedCategory(p.category_name)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      selectedCategory === p.category_name
                        ? 'bg-amber-500 text-slate-900'
                        : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {p.category_name} ({p.items_count})
                  </button>
                ))}
              </div>
            </div>

            {/* Material breakdown table */}
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Box className="w-4 h-4" /> รายการวัสดุและราคาตลาด
              </h2>
              <div className="space-y-3">
                {filteredPrices.map(p => {
                  const colors = CATEGORY_COLORS[p.category_name] || CATEGORY_COLORS.Cement;
                  const qty = getQty(p.category_name);
                  const cost = qty * p.avg_price;
                  return (
                    <div key={p.category_name} className={`${colors.bg} border ${colors.border} rounded-2xl p-5`}>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white">{p.category_name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                              {p.items_count} รายการ
                            </span>
                            <span className="text-xs text-slate-500">({p.best_source})</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span>ต่ำสุด: <span className="text-green-400">฿{p.min_price.toLocaleString()}</span></span>
                            <span>สูงสุด: <span className="text-red-400">฿{p.max_price.toLocaleString()}</span></span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xl font-black ${colors.text}`}>฿{p.avg_price.toLocaleString()}</p>
                          <p className="text-xs text-slate-500">ต่อ {p.price_per_unit || 'หน่วย'}</p>
                        </div>
                      </div>

                      {/* Quantity slider */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-8">ปริมาณ</span>
                          <input
                            type="range"
                            min="0"
                            max={area * 3}
                            step="1"
                            value={qty}
                            onChange={(e) => updateQty(p.category_name, Number(e.target.value))}
                            className="flex-1 accent-amber-500"
                          />
                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) => updateQty(p.category_name, Number(e.target.value))}
                            className="w-24 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white text-right"
                          />
                          <span className="text-xs text-slate-500 w-12">ตร.ม.</span>
                        </div>
                        <div className="flex justify-end">
                          <div className={`flex items-center gap-1 text-sm font-bold ${colors.text}`}>
                            <span className="text-slate-500">=</span>
                            <span className="text-base">฿{cost.toLocaleString()}</span>
                            {cost > 0 && (
                              qty * p.avg_price > qty * p.min_price
                                ? <TrendingUp className="w-4 h-4 text-red-400" />
                                : <TrendingDown className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredPrices.length === 0 && !loading && (
                  <div className="text-center py-12 text-slate-500">
                    <p>ไม่พบข้อมูลวัสดุ กรุณากดปุ่ม &quot;ซิงค์จาก DW&quot; เพื่อดึงข้อมูลจาก Data Warehouse</p>
                  </div>
                )}
              </div>
            </div>

            {/* DW info */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3 text-sm text-blue-400">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                ราคาที่แสดงเป็นค่าเฉลี่ยจากระบบ Web Scraping (Onestock, Homepro, Dohome, ThaiWatsadu) อ้างอิงจาก
                <span className="font-bold"> Data Warehouse (DW&BI) </span>
                5 หมวดหลัก: เหล็ก ปูน อิฐ ไม้ หิน
              </p>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-6">
          {/* Total cost card */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-8 text-slate-900 shadow-xl shadow-amber-500/20">
            <p className="text-sm font-bold uppercase tracking-wider opacity-70 mb-2">งบประมาณประมาณการ</p>
            <p className="text-5xl font-black mb-1">฿{Math.round(grandTotal).toLocaleString()}</p>
            <p className="text-sm font-medium opacity-70 mb-6">
              ช่วง: ฿{Math.round(lowestTotal).toLocaleString()} – ฿{Math.round(highestTotal).toLocaleString()}
            </p>
            <div className="space-y-3 pt-6 border-t border-slate-900/10">
              <div className="flex justify-between text-sm font-medium">
                <span>พื้นที่ทั้งหมด</span>
                <span className="font-bold">{area.toLocaleString()} ตร.ม.</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>หมวดหมู่ที่เลือก</span>
                <span className="font-bold">
                  {selectedCategory === 'all' ? 'ทั้งหมด' : selectedCategory}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>จำนวนวัสดุ</span>
                <span className="font-bold">{filteredPrices.length} หมวด</span>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!token) { alert("กรุณาเข้าสู่ระบบก่อน"); return; }
                setSaved(false);
                const rows = filteredPrices.map(p => ({
                  category: p.category_name,
                  quantity: getQty(p.category_name),
                  unit_price: p.avg_price,
                  total: getQty(p.category_name) * p.avg_price,
                }));
                try {
                  await fetch(`${API}/api/quotations/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ title: `ใบเสนอราคา ${new Date().toLocaleDateString('th-TH')}`, items: rows, total: grandTotal }),
                  });
                  setSaved(true);
                  setTimeout(() => setSaved(false), 3000);
                } catch { alert("บันทึกไม่สำเร็จ กรุณาลองใหม่"); }
              }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 mt-6 py-4 rounded-xl font-bold transition-colors cursor-pointer shadow-sm shadow-amber-500/10"
            >
              {saved ? "✓ บันทึกแล้ว" : "💾 บันทึกใบเสนอราคา"}
            </button>
          </div>

          {/* Category summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Box className="w-4 h-4 text-amber-500" /> สรุปตามหมวดหมู่
            </h3>
            {filteredPrices.map(p => {
              const qty = getQty(p.category_name);
              const cost = qty * p.avg_price;
              const pct = grandTotal > 0 ? (cost / grandTotal) * 100 : 0;
              return (
                <div key={p.category_name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">{p.category_name}</span>
                    <span className="text-white font-medium">฿{cost.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Price range info */}
          {filteredPrices.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" /> ข้อมูลราคาตลาด
              </h3>
              {filteredPrices.map(p => (
                <div key={p.category_name} className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">{p.category_name}</span>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-green-400">฿{p.min_price.toLocaleString()}</span>
                    <span className="text-slate-600">–</span>
                    <span className="text-red-400">฿{p.max_price.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
