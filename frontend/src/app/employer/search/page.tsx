"use client";
import React, { useState, useEffect } from "react";
import { Search, Filter, Star, MapPin, CheckCircle2, ChevronRight, ArrowLeft, MessageSquare, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/ui/SafeImage";

interface Service {
  id: string;
  portfolio_id: number;
  title: string;
  contractorId: number;
  contractorName: string;
  category: string;
  startingPrice: number;
  rating: number;
  reviews: number;
  location: string;
  coverImage: string;
  avatar: string;
  verified: boolean;
  detailDescription: string;
  experienceYears: number;
}

const CATEGORIES = ["ทั้งหมด", "ก่อสร้างที่พักอาศัย", "อาคารสาธารณะ", "ต่อเติมและซ่อมแซม", "ออกแบบภายใน", "ทั่วไป"];

// Detail Page Component
const ServiceDetailPage = ({ service, onBack, onChat }: { service: Service; onBack: () => void; onChat: () => void }) => (
  <div className="space-y-6">
    <button onClick={onBack} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-foreground transition-colors cursor-pointer">
      <ArrowLeft className="w-4 h-4" /> กลับไปค้นหา
    </button>

    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="relative aspect-video">
        <SafeImage src={service.coverImage} alt={service.title} width={960} height={540} unoptimized loading="eager" fallbackKind="cover" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background dark:from-slate-900 via-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="inline-block bg-amber-500/90 text-slate-900 text-xs font-bold px-3 py-1 rounded mb-3">
            {service.category}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{service.title}</h1>
        </div>
      </div>

      <div className="p-8 grid lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contractor */}
          <div className="flex items-center gap-4 pb-6 border-b border-border">
            <SafeImage src={service.avatar} alt={service.contractorName} width={64} height={64} unoptimized fallbackKind="avatar" className="w-16 h-16 rounded-full border-2 border-amber-500/50 object-cover" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{service.contractorName}</h2>
                {service.verified && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-650 dark:text-slate-400 mt-1">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500 fill-amber-500" />{service.rating} ({service.reviews} รีวิว)</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{service.location}</span>
                <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" />{service.experienceYears} ปี</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-foreground font-bold text-lg mb-3">รายละเอียดบริการ</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {service.detailDescription || "ยังไม่มีรายละเอียดบริการ"}
            </p>
          </div>
        </div>

        {/* Sidebar CTA */}
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-border rounded-2xl p-6 sticky top-4 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">ราคาเริ่มต้น</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">฿{service.startingPrice.toLocaleString()}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">ราคาอาจปรับตามรายละเอียดงาน</p>

            <button
              onClick={onChat}
              className="w-full mt-5 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-xl transition-colors cursor-pointer shadow-sm shadow-amber-500/10"
            >
              <MessageSquare className="w-5 h-5" />
              ทักแชทเพื่อเจรจา
            </button>
            <button onClick={onChat} className="w-full mt-2 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-xl transition-colors text-sm border border-border cursor-pointer">
              ขอใบเสนอราคา
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Card Component
const ServiceCard = ({ service, onClick, eager = false }: { service: Service; onClick: () => void; eager?: boolean }) => (
  <div
    onClick={onClick}
    className="bg-card border border-border rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all group flex flex-col h-full cursor-pointer shadow-sm hover:shadow"
  >
    <div className="relative aspect-video overflow-hidden">
      <SafeImage src={service.coverImage} alt={service.title} width={640} height={360} unoptimized loading={eager ? "eager" : "lazy"} fallbackKind="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute top-3 left-3 bg-card/85 backdrop-blur-sm text-amber-600 dark:text-amber-500 text-xs font-bold px-2 py-1 rounded border border-amber-500/30">
        {service.category}
      </div>
    </div>
    <div className="p-5 flex-1 flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <SafeImage src={service.avatar} alt={service.contractorName} width={32} height={32} unoptimized fallbackKind="avatar" className="w-8 h-8 rounded-full border border-border object-cover" />
        <div className="flex items-center gap-1">
          <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{service.contractorName}</span>
          {service.verified && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        </div>
      </div>
      <h3 className="text-foreground font-bold text-base leading-tight mb-3 line-clamp-2">{service.title}</h3>
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4 mt-auto">
        <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /><span className="text-slate-700 dark:text-slate-300 font-medium">{service.rating}</span><span>({service.reviews})</span></div>
        <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /><span>{service.location}</span></div>
      </div>
      <div className="pt-4 border-t border-border flex items-end justify-between gap-3 mt-auto">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">ราคาเริ่มต้น</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">฿{service.startingPrice.toLocaleString()}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 whitespace-nowrap text-amber-600 dark:text-amber-500 text-sm font-semibold">
          ดูรายละเอียด <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  </div>
);

export default function MarketplacePage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');
    fetch(`${API}/api/marketplace/services`)
      .then(res => res.json())
      .then(data => { setServices(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleChatClick = (service: Service) => {
    router.push(`/employer/chat?contractorId=${service.contractorId}`);
  };

  const filteredServices = services.filter(s => {
    const matchCategory = activeCategory === "ทั้งหมด" || s.category === activeCategory;
    const matchSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contractorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  if (selectedService) {
    return (
      <ServiceDetailPage
        service={selectedService}
        onBack={() => setSelectedService(null)}
        onChat={() => handleChatClick(selectedService)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">ค้นหาผู้รับเหมา</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">ค้นหาและเปรียบเทียบผู้รับเหมาคุณภาพ พร้อมระบบแชทเจรจาคุ้มครองด้วย Dual Confirmation</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="ค้นหาบริการ, ชื่อผู้รับเหมา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950/40 border border-border rounded-xl py-2.5 pl-10 pr-4 text-foreground focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto scrollbar-none">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mr-2 shrink-0">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">หมวดหมู่:</span>
          </div>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${activeCategory === cat ? "bg-amber-500 text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-border"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredServices.map((service, index) => (
            <ServiceCard key={service.id} service={service} eager={index < 3} onClick={() => setSelectedService(service)} />
          ))}
        </div>
      )}

      {!loading && filteredServices.length === 0 && (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-border border-dashed">
          <p className="text-slate-500 dark:text-slate-400">ไม่พบบริการที่ตรงกับเงื่อนไขการค้นหา</p>
        </div>
      )}
    </div>
  );
}
