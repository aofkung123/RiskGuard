"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Paperclip, FileText, Plus, Minus, X, CheckCircle2, Image as ImageIcon, Loader2
} from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";

type MessageType = "text" | "quotation" | "update" | "system_update" | "image";
type ActionStatus = "pending" | "approved" | "rejected";

interface Contact {
  id: number;
  name: string;
  role: string;
  avatar: string;
}

interface Message {
  id: string;
  sender: "me" | "employer";
  sender_id: number;
  type: MessageType;
  text?: string;
  content?: string;
  timestamp: string;
  actionData?: {
    title: string;
    description: string;
    amount?: number;
    status: ActionStatus;
  };
}

type MessageResponse = Omit<Message, "sender"> & {
  sender: string;
};

interface ParsedQuoteLine {
  category: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
}

const parseQuotationDescription = (desc: string): { items: ParsedQuoteLine[]; days: string } => {
  try {
    const parts = desc.split(" | ");
    const itemsPart = parts[0] || "";
    const durationPart = parts[1] || "";

    const daysMatch = durationPart.match(/\d+/);
    const days = daysMatch ? daysMatch[0] : "14";

    const items = itemsPart.split(", ").map(itemStr => {
      const catSplit = itemStr.split(": ");
      const category = catSplit[0] || "";
      const rest = catSplit.slice(1).join(": ");

      const priceSplit = rest.split(" @฿");
      const price = priceSplit[1] ? parseInt(priceSplit[1].replace(/,/g, "")) || 0 : 0;
      const mainPart = priceSplit[0] || "";

      const words = mainPart.trim().split(/\s+/);
      let name = "";
      let qty = 1;
      let unit = "หน่วย";

      if (words.length >= 3) {
        const last = words[words.length - 1];
        const prev = words[words.length - 2];
        if (!isNaN(Number(prev))) {
          qty = Number(prev);
          unit = last;
          name = words.slice(0, words.length - 2).join(" ");
        } else {
          name = words.join(" ");
        }
      } else if (words.length === 2) {
        name = words[0];
        qty = Number(words[1]) || 1;
      } else {
        name = mainPart;
      }

      return { category, name, qty, unit, price };
    }).filter(item => item.category || item.name);

    return { items, days };
  } catch (err) {
    console.error("Failed to parse description:", err);
    return { items: [], days: "14" };
  }
};

function getInitialEmployerId() {
  if (typeof window === "undefined") return null;
  const eid = new URLSearchParams(window.location.search).get("employerId");
  if (!eid) return null;
  const parsed = parseInt(eid, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

// ─── Quotation Card (Contractor view) ──────────────────────────────────────────
const QuotationCard = ({ msg, onViewDetail }: { msg: Message; onViewDetail?: (msg: Message) => void }) => {
  const d = msg.actionData;
  if (!d) return null;
  const isApproved = d.status === "approved";
  const isRejected = d.status === "rejected";
  const isPending = d.status === "pending";

  const { items, days } = parseQuotationDescription(d.description || "");

  return (
    <div 
      onClick={() => onViewDetail && onViewDetail(msg)}
      className="bg-card border border-blue-500/30 rounded-2xl p-5 w-80 shadow-xl shadow-blue-500/5 hover:scale-[1.02] hover:border-blue-500/50 hover:shadow-blue-500/10 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="font-bold text-foreground text-sm leading-tight group-hover:text-blue-500 transition-colors">{d.title}</span>
      </div>
      
      {/* Organized Items List */}
      <div className="space-y-2 mb-4 max-h-36 overflow-y-auto scrollbar-none pr-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-start text-xs border-b border-border/20 pb-1">
            <div className="min-w-0 flex-1 pr-2">
              <p className="font-semibold text-foreground truncate">{item.name || item.category}</p>
              <p className="text-[10px] text-slate-500 truncate">{item.category}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-foreground">{item.qty} {item.unit}</p>
              <p className="text-[10px] text-slate-500">@{item.price > 0 ? `฿${item.price.toLocaleString()}` : "฿0"}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center text-[10px] text-slate-500 mb-3 bg-slate-550/5 px-2.5 py-1.5 rounded-lg border border-border/40">
        <span>⏱️ ระยะเวลาดำเนินงาน:</span>
        <span className="font-semibold text-foreground">{days} วัน</span>
      </div>

      {d.amount !== undefined && (
        <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 mb-4 flex justify-between items-center border border-border/40">
          <span className="text-slate-500 text-xs">ยอดรวมทั้งสิ้น</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-black text-xl">฿{d.amount.toLocaleString()}</span>
        </div>
      )}
      {isPending && (
        <div className="py-2.5 text-center text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-pulse">
          ⏳ รอผู้ว่าจ้างพิจารณา (คลิกดูรายละเอียด)
        </div>
      )}
      {isApproved && (
        <div className="flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">อนุมัติแล้ว ✅</span>
        </div>
      )}
      {isRejected && (
        <div className="py-2.5 text-center text-xs font-bold text-red-700 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
          ❌ ถูกตีกลับ — คลิกเพื่อดู / ปรับแก้ไข
        </div>
      )}
    </div>
  );
};

interface DwCategory { id: number; name: string; display_name: string; icon?: string; }
interface DwProduct {
  id: number; product_name: string; brand_name?: string; model_code?: string;
  unit: string; price_thb: number; source: string; category_id: number;
}
interface QuoteLine {
  category_id: number; category_name: string; source: string; brand: string;
  product_id: number | null; product_name: string; qty: number; unit: string; price: number;
}

// ─── Main Contractor Chat Page ────────────────────────────────────────────────
export default function ContractorChatPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
  const [myId, setMyId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    fetch(`${API}/api/profile/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.id) setMyId(d.id); else window.location.href = "/login"; })
      .catch(() => { localStorage.removeItem("token"); window.location.href = "/login"; });
  }, [API, token]);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [employerId, setEmployerId] = useState<number | null>(getInitialEmployerId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [sendingImage, setSendingImage] = useState(false);
  const [selectedChatFile, setSelectedChatFile] = useState<File | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Message | null>(null);

  // Quotation form
  const [qTitle, setQTitle] = useState("ใบเสนอราคา: ต่อเติมหลังคาโรงรถ");
  const [qDays, setQDays] = useState("14");
  const [lines, setLines] = useState<QuoteLine[]>([]);

  // DW-backed material data
  const [dwCategories, setDwCategories] = useState<DwCategory[]>([]);
  const [dwProducts, setDwProducts] = useState<Record<string | number, DwProduct[]>>({});
  const [loadingProducts, setLoadingProducts] = useState<Record<string | number, boolean>>({});
  const [dwLoaded, setDwLoaded] = useState(false);

  // Fetch products for a specific category
  const fetchDwProducts = useCallback(async (categoryId: number) => {
    if (dwProducts[categoryId] || dwProducts[String(categoryId)]) return; // already cached
    setLoadingProducts(prev => ({ ...prev, [categoryId]: true }));
    try {
      const res = await fetch(`${API}/api/materials/?category_id=${categoryId}&limit=100`);
      const prods: DwProduct[] = await res.json();
      setDwProducts(prev => ({ ...prev, [categoryId]: prods }));
    } catch { /* silent */ }
    setLoadingProducts(prev => ({ ...prev, [categoryId]: false }));
  }, [API, dwProducts]);

  // Fetch categories from DW on modal open (safety fallback)
  const fetchDwCategories = useCallback(async () => {
    if (dwLoaded) return;
    try {
      const res = await fetch(`${API}/api/materials/categories`);
      const cats: DwCategory[] = await res.json();
      setDwCategories(cats);
      setDwLoaded(true);
      // Initialize with first category
      if (cats.length > 0 && lines.length === 0) {
        setLines([{
          category_id: cats[0].id, category_name: cats[0].display_name,
          product_id: null, product_name: "", brand: "", qty: 1,
          unit: "หน่วย", price: 0, source: "",
        }]);
        void fetchDwProducts(cats[0].id);
      }
    } catch { /* silent */ }
  }, [API, dwLoaded, lines.length, fetchDwProducts]);

  // Pre-fetch categories and products for ALL categories once myId is set
  useEffect(() => {
    if (!myId || dwLoaded) return;
    const prefetchData = async () => {
      try {
        const res = await fetch(`${API}/api/materials/categories`);
        if (!res.ok) return;
        const cats: DwCategory[] = await res.json();
        setDwCategories(cats);
        setDwLoaded(true);
        if (cats.length > 0 && lines.length === 0) {
          setLines([{
            category_id: cats[0].id, category_name: cats[0].display_name,
            product_id: null, product_name: "", brand: "", qty: 1,
            unit: "หน่วย", price: 0, source: "",
          }]);
        }
        // Background load products for all categories sequentially
        for (const cat of cats) {
          try {
            const pRes = await fetch(`${API}/api/materials/?category_id=${cat.id}&limit=100`);
            if (pRes.ok) {
              const prods: DwProduct[] = await pRes.json();
              setDwProducts(prev => ({ ...prev, [cat.id]: prods }));
            }
          } catch { /* silent */ }
        }
      } catch { /* silent */ }
    };
    void prefetchData();
  }, [myId, API, dwLoaded, lines.length]);

  // Get unique sources for a category
  const getSourcesForCategory = (categoryId: number): string[] => {
    const prods = dwProducts[categoryId] || dwProducts[String(categoryId)] || [];
    return [...new Set(prods.map(p => p.source).filter(s => s.trim()))].sort();
  };

  // Get unique brands for a category + source combination
  const getBrandsForCategorySource = (categoryId: number, source: string): string[] => {
    const prods = dwProducts[categoryId] || dwProducts[String(categoryId)] || [];
    return [...new Set(
      prods.filter(p => p.source === source).map(p => p.brand_name || "ไม่ระบุ")
    )].filter(b => b.trim()).sort();
  };

  // Get products filtered by category + source + brand, sorted by price (low→high)
  const getProductsForCategorySourceBrand = (categoryId: number, source: string, brand: string): DwProduct[] => {
    const prods = dwProducts[categoryId] || dwProducts[String(categoryId)] || [];
    return prods
      .filter(p => p.source === source && (p.brand_name || "ไม่ระบุ") === brand)
      .sort((a, b) => a.price_thb - b.price_thb);
  };

  // ── Fetch contacts from API ──────────────────────────────────────────────────
  const fetchContacts = useCallback(() => {
    if (!myId) return;
    fetch(`${API}/api/chat/contacts?user_id=${myId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: Contact[]) => {
        setContacts(data);
        setLoadingContacts(false);
        // Auto-select first contact
        if (data.length > 0 && !employerId) {
          setEmployerId(data[0].id);
        }
      })
      .catch(() => setLoadingContacts(false));
  }, [API, myId, employerId, token]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // ── Fetch messages ────────────────────────────────────────────────────────────
  const fetchMessages = useCallback(() => {
    if (!employerId || !myId) return;
    fetch(`${API}/api/chat/messages?user1=${myId}&user2=${employerId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: MessageResponse[]) => {
        const mapped = data.map(m => ({
          ...m,
          sender: m.sender_id === myId ? "me" : "employer",
        })) as Message[];
        setMessages(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [employerId, API, myId, token]);

  useEffect(() => {
    const initFetch = async () => {
      setLoading(true);
      fetchMessages();
    };
    initFetch();
    const t = setInterval(fetchMessages, 3000);
    return () => clearInterval(t);
  }, [fetchMessages]);

  // Auto-scroll only when user is already near the bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleChatScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distFromBottom < 150;
  };

  const totalAmount = lines.reduce((s, l) => s + l.qty * l.price, 0);

  const handleSend = () => {
    if (!inputText.trim() || !employerId) return;
    const text = inputText.trim();
    setInputText("");
    fetch(`${API}/api/chat/messages`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ receiver_id: employerId, content: text, type: "text" }),
    }).then(fetchMessages).catch(() => setInputText(text));
  };

  const handleSendQuotation = () => {
    if (!employerId) return;
    const description = lines
      .map(l => `${l.category_name}: ${l.product_name || l.brand} ${l.qty} ${l.unit} @฿${l.price.toLocaleString()} [${l.source}]`)
      .join(", ") + ` | ระยะเวลาดำเนินงาน ${qDays} วัน`;

    fetch(`${API}/api/chat/messages`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        receiver_id: employerId,
        content: "ใบเสนอราคา", type: "quotation",
        action_data: { title: qTitle, description, amount: totalAmount, status: "pending" },
      }),
    }).then(() => { setShowQuoteModal(false); fetchMessages(); }).catch(() => alert("ส่งใบเสนอราคาไม่สำเร็จ กรุณาลองใหม่"));
  };

  const handleSendImage = async () => {
    if (!employerId) return;
    setSendingImage(true);
    try {
      let finalUrl = imageUrl.trim();

      if (selectedChatFile) {
        const formData = new FormData();
        formData.append("file", selectedChatFile);

        const uploadRes = await fetch(`${API}/api/chat/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Upload failed");
        const data = await uploadRes.json();
        finalUrl = data.url;
      }

      if (!finalUrl) {
        setSendingImage(false);
        return;
      }

      const res = await fetch(`${API}/api/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          receiver_id: employerId,
          content: `image|${finalUrl}`,
          type: "image",
        }),
      });

      if (!res.ok) throw new Error("Send message failed");

      setShowImageUploader(false);
      setImageUrl("");
      setImagePreview("");
      setSelectedChatFile(null);
      setSendingImage(false);
      fetchMessages();
    } catch (err) {
      console.error(err);
      alert("อัปโหลดหรือส่งรูปภาพไม่สำเร็จ กรุณาลองใหม่");
      setSendingImage(false);
    }
  };

  const updateLine = (i: number, field: keyof QuoteLine, value: string | number | null) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const handleCategoryChange = (i: number, categoryId: number) => {
    const cat = dwCategories.find(c => c.id === categoryId);
    setLines(prev => prev.map((l, idx) => idx === i ? {
      ...l, category_id: categoryId, category_name: cat?.display_name || "",
      source: "", brand: "", product_id: null, product_name: "", price: 0, unit: "หน่วย",
    } : l));
    void fetchDwProducts(categoryId);
  };

  const handleSourceChange = (i: number, source: string) => {
    setLines(prev => prev.map((l, idx) => idx === i ? {
      ...l, source, brand: "", product_id: null, product_name: "", price: 0,
    } : l));
  };

  const handleBrandChange = (i: number, brand: string) => {
    setLines(prev => prev.map((l, idx) => idx === i ? {
      ...l, brand, product_id: null, product_name: "", price: 0,
    } : l));
  };

  const handleProductChange = (i: number, productId: number) => {
    const line = lines[i];
    const prods = dwProducts[line.category_id] || dwProducts[String(line.category_id)] || [];
    const prod = prods.find(p => p.id === productId);
    if (!prod) return;
    setLines(prev => prev.map((l, idx) => idx === i ? {
      ...l, product_id: prod.id, product_name: prod.product_name,
      brand: prod.brand_name || "ไม่ระบุ", source: prod.source,
      price: Math.round(prod.price_thb), unit: prod.unit || "หน่วย",
    } : l));
  };

  const addLine = () => {
    const firstCat = dwCategories[0];
    if (!firstCat) return;
    setLines(prev => [...prev, {
      category_id: firstCat.id, category_name: firstCat.display_name,
      source: "", brand: "", product_id: null, product_name: "", qty: 1,
      unit: "หน่วย", price: 0,
    }]);
  };

  const removeLine = (i: number) =>
    setLines(prev => prev.filter((_, idx) => idx !== i));

  const activeContact = contacts.find(c => c.id === employerId);

  // ── Render message bubbles ──────────────────────────────────────────────────
  const renderMessage = (msg: Message) => {
    const isMe = msg.sender === "me";

    if (msg.type === "image") {
      const imgSrc = msg.content?.replace("image|", "") || msg.text || "";
      return (
        <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
          <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[70%]`}>
            {imgSrc ? (
              <a href={imgSrc} target="_blank" rel="noopener noreferrer">
                <SafeImage
                  src={imgSrc}
                  alt="รูปภาพ"
                  width={720}
                  height={420}
                  unoptimized
                  fallbackKind="image"
                  className="rounded-2xl max-w-full max-h-72 object-cover border border-border hover:opacity-90 transition-opacity"
                />
              </a>
            ) : (
              <div className="bg-slate-100 dark:bg-slate-800 border border-border rounded-2xl px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">
                ไม่สามารถแสดงรูปภาพได้
              </div>
            )}
            <span className="text-[10px] text-slate-500 dark:text-slate-455 mt-1 px-1">{msg.timestamp}</span>
          </div>
        </div>
      );
    }

    if (msg.type === "text") {
      return (
        <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
          <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe
                ? "bg-blue-600 text-white rounded-tr-none"
                : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-border"
              }`}>
              {msg.text}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-455 mt-1 px-1">{msg.timestamp}</span>
          </div>
        </div>
      );
    }

    if (msg.type === "system_update") {
      return (
        <div className="flex justify-center">
          <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-sm text-emerald-750 dark:text-emerald-300 max-w-sm">
            <span className="shrink-0">🔔</span>
            <span>{msg.text}</span>
          </div>
        </div>
      );
    }

    if (msg.type === "quotation") {
      return (
        <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
          <QuotationCard msg={msg} onViewDetail={setSelectedQuotation} />
        </div>
      );
    }

    return null;
  };

  if (!myId) return <div className="p-8 text-center text-slate-500 dark:text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>;

  return (
    <>
      <div className="h-[calc(100vh-6rem)] flex bg-background border border-border rounded-2xl overflow-hidden shadow-sm">

        {/* ── Sidebar: Contact List ── */}
        <div className="w-72 shrink-0 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border flex-shrink-0">
            <h2 className="text-foreground font-bold">รายการลูกค้า</h2>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-none">
            {loadingContacts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-slate-400 dark:text-slate-600 animate-spin" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-slate-600 dark:text-slate-400 text-sm">ยังไม่มีการสนทนา</p>
                <p className="text-slate-550 dark:text-slate-450 text-xs mt-1">รอผู้ว่าจ้างติดต่อคุณ</p>
              </div>
            ) : (
              contacts.map(c => (
                <div
                  key={c.id}
                  onClick={() => { if (employerId !== c.id) { setEmployerId(c.id); setMessages([]); } }}
                  className={`p-4 flex items-center gap-3 cursor-pointer border-b border-border/50 transition-colors
                    ${employerId === c.id ? "bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}
                >
                  <SafeImage src={c.avatar} alt={c.name} width={40} height={40} unoptimized fallbackKind="avatar" className="w-10 h-10 rounded-full border border-border object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${employerId === c.id ? "text-blue-650 dark:text-blue-400 font-bold" : "text-foreground"}`}>{c.name}</p>
                    <p className="text-xs text-slate-550 dark:text-slate-450 capitalize">{c.role}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Main Chat ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="bg-card border-b border-border px-5 py-4 flex items-center justify-between shrink-0">
            {activeContact ? (
              <div className="flex items-center gap-3">
                <SafeImage src={activeContact.avatar} alt={activeContact.name} width={44} height={44} unoptimized fallbackKind="avatar" className="w-11 h-11 rounded-full border-2 border-border object-cover" />
                <div>
                  <p className="text-foreground font-bold">{activeContact.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">ออนไลน์</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-450 text-sm">เลือกผู้ว่าจ้างเพื่อเริ่มสนทนา</p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImageUploader(true)}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-border px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                title="ส่งรูปภาพ"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setShowQuoteModal(true); void fetchDwCategories(); }}
                disabled={!activeContact}
                className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-600 text-blue-650 dark:text-blue-400 hover:text-white border border-blue-200 dark:border-blue-500/40 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <FileText className="w-4 h-4" /> ส่งใบเสนอราคา
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleChatScroll}
            className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-5 bg-slate-50/50 dark:bg-slate-950"
          >
            {!activeContact ? (
              <div className="text-center text-slate-500 dark:text-slate-600 pt-16 text-sm">
                เลือกผู้ว่าจ้างจากรายการด้านซ้ายเพื่อเริ่มสนทนา
              </div>
            ) : loading ? (
              <div className="flex justify-center pt-16">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-600 pt-16 text-sm">ยังไม่มีข้อความ</div>
            ) : (
              messages.map(msg => (
                <React.Fragment key={msg.id}>{renderMessage(msg)}</React.Fragment>
              ))
            )}
          </div>

          {/* Input */}
          <div className="bg-card border-t border-border p-4 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImageUploader(true)}
                className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-border text-slate-600 dark:text-slate-400 hover:text-foreground rounded-full transition-colors shrink-0 cursor-pointer"
                title="แนบรูปภาพ"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="พิมพ์ข้อความที่นี่..."
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-border rounded-full py-2.5 px-5 text-foreground text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || !activeContact}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-full transition-colors shrink-0 cursor-pointer shadow-sm shadow-blue-500/10"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Image Uploader Modal ─── */}
      {showImageUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-500" /> ส่งรูปภาพ
              </h3>
              <button onClick={() => { setShowImageUploader(false); setImageUrl(""); setImagePreview(""); }}
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">เลือกรูปภาพที่ต้องการส่ง</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setSelectedChatFile(file);
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => {
                        if (ev.target?.result) {
                          setImagePreview(ev.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    } else {
                      setImagePreview("");
                    }
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2 text-foreground text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              {imagePreview && (
                <div className="rounded-xl overflow-hidden border border-border relative group h-48">
                  <SafeImage
                    src={imagePreview}
                    alt="preview"
                    width={640}
                    height={360}
                    unoptimized
                    fallbackKind="image"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => { setSelectedChatFile(null); setImagePreview(""); }}
                    className="absolute top-2 right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1.5 shadow-md transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {!imagePreview && (
                <div className="h-48 flex items-center justify-center rounded-xl border border-dashed border-border text-slate-500 dark:text-slate-600 text-sm">
                  เลือกรูปภาพเพื่อพรีวิวก่อนส่งที่นี่
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setShowImageUploader(false); setImageUrl(""); setImagePreview(""); setSelectedChatFile(null); }}
                  className="flex-1 py-3 border border-border text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm cursor-pointer">
                  ยกเลิก
                </button>
                <button onClick={handleSendImage}
                  disabled={(!selectedChatFile && !imageUrl.trim()) || sendingImage}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-500/10">
                  {sendingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sendingImage ? "กำลังส่ง..." : "ส่งรูปภาพ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Quotation Modal (DW-Powered) ─── */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-none shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" /> สร้างใบเสนอราคา
                <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-2">
                  ราคาจาก DW
                </span>
              </h3>
              <button onClick={() => setShowQuoteModal(false)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title & Days */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">หัวข้อใบเสนอราคา</label>
                <input value={qTitle} onChange={e => setQTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">ระยะเวลา (วัน)</label>
                <input type="number" value={qDays} onChange={e => setQDays(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            {/* DW Data Info Badge */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
              <span className="text-blue-600 dark:text-blue-400 text-xs">📊</span>
              <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                ราคาวัสดุดึงจาก Data Warehouse (Onestock / Homepro / Dohome / ThaiWatsadu) — {dwCategories.length} หมวด
              </span>
            </div>

            {/* Line Items — DW-Powered */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">รายการวัสดุจาก DW</label>
                <button onClick={addLine} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-500 text-xs font-semibold cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
                </button>
              </div>

              <div className="space-y-3">
                {lines.map((l, i) => {
                  const sources = getSourcesForCategory(l.category_id);
                  const brands = l.source ? getBrandsForCategorySource(l.category_id, l.source) : [];
                  const products = l.source && l.brand
                    ? getProductsForCategorySourceBrand(l.category_id, l.source, l.brand)
                    : [];
                  const isLoading = loadingProducts[l.category_id] || false;

                  return (
                    <div key={i} className="bg-slate-50/50 dark:bg-slate-950/50 border border-border rounded-xl p-4 space-y-3">
                      {/* Row 1: Category + Source + Brand + Product */}
                      <div className="grid grid-cols-12 gap-2 items-end">
                        {/* Category */}
                        <div className="col-span-2">
                          <label className="block text-[10px] text-slate-500 dark:text-slate-450 mb-1">หมวดสินค้า</label>
                          <select
                            value={l.category_id}
                            onChange={e => handleCategoryChange(i, parseInt(e.target.value))}
                            className="w-full bg-white dark:bg-slate-900 border border-border rounded-lg px-2 py-2 text-foreground text-xs focus:outline-none focus:border-blue-500"
                          >
                            {dwCategories.map(c => (
                              <option key={c.id} value={c.id}>{c.display_name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Source */}
                        <div className="col-span-3">
                          <label className="block text-[10px] text-slate-500 dark:text-slate-450 mb-1">แหล่งที่</label>
                          {isLoading ? (
                            <div className="flex items-center gap-1 py-2 px-2 text-xs text-slate-400">
                              <Loader2 className="w-3 h-3 animate-spin" /> โหลด...
                            </div>
                          ) : (
                            <select
                              value={l.source}
                              onChange={e => handleSourceChange(i, e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-border rounded-lg px-2 py-2 text-foreground text-xs focus:outline-none focus:border-blue-500"
                            >
                              <option value="">เลือกแหล่งที่</option>
                              {sources.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Brand */}
                        <div className="col-span-3">
                          <label className="block text-[10px] text-slate-500 dark:text-slate-450 mb-1">แบรนด์</label>
                          <select
                            value={l.brand}
                            onChange={e => handleBrandChange(i, e.target.value)}
                            disabled={!l.source}
                            className="w-full bg-white dark:bg-slate-900 border border-border rounded-lg px-2 py-2 text-foreground text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
                          >
                            <option value="">เลือกแบรนด์</option>
                            {brands.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>

                        {/* Product */}
                        <div className="col-span-3">
                          <label className="block text-[10px] text-slate-500 dark:text-slate-450 mb-1">สินค้า</label>
                          <select
                            value={l.product_id ?? ""}
                            onChange={e => handleProductChange(i, parseInt(e.target.value))}
                            disabled={!l.brand}
                            className="w-full bg-white dark:bg-slate-900 border border-border rounded-lg px-2 py-2 text-foreground text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
                          >
                            <option value="">เลือกสินค้า</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.product_name} | ฿{Math.round(p.price_thb).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Remove */}
                        <div className="col-span-1 flex justify-center pb-1">
                          {lines.length > 1 && (
                            <button onClick={() => removeLine(i)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer">
                              <Minus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Qty + Unit + Price + Total */}
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-2">
                          <label className="block text-[10px] text-slate-500 dark:text-slate-450 mb-1">จำนวน</label>
                          <input type="number" min="1" value={l.qty}
                            onChange={e => updateLine(i, "qty", parseInt(e.target.value) || 1)}
                            className="w-full bg-white dark:bg-slate-900 border border-border rounded-lg px-2 py-2 text-foreground text-xs focus:outline-none focus:border-blue-500 text-center" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] text-slate-500 dark:text-slate-450 mb-1">หน่วย</label>
                          <input value={l.unit} onChange={e => updateLine(i, "unit", e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-border rounded-lg px-2 py-2 text-foreground text-xs focus:outline-none focus:border-blue-500" />
                        </div>
                        <div className="col-span-4">
                          <label className="block text-[10px] text-slate-500 dark:text-slate-450 mb-1">ราคา/หน่วย (บาท)</label>
                          <input type="number" value={l.price}
                            onChange={e => updateLine(i, "price", parseInt(e.target.value) || 0)}
                            className="w-full bg-white dark:bg-slate-900 border border-border rounded-lg px-2 py-2 text-foreground text-xs focus:outline-none focus:border-blue-500" />
                        </div>
                        <div className="col-span-4">
                          <label className="block text-[10px] text-slate-500 dark:text-slate-450 mb-1">รวม</label>
                          <div className="flex items-center justify-end gap-1 py-2 px-2 rounded-lg bg-blue-500/5 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs font-bold text-blue-700 dark:text-blue-400">
                            ฿{(l.qty * l.price).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Source badge */}
                      {l.source && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">🏪 {l.source}</span>
                          {l.product_name && <span className="text-slate-500">· {l.product_name}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total */}
            <div className="bg-gradient-to-r from-blue-500/5 to-emerald-500/5 dark:from-blue-500/10 dark:to-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 mb-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">ระยะเวลาดำเนินการ</p>
                  <p className="text-foreground font-semibold text-sm">{qDays} วัน</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-600 dark:text-slate-400 text-xs">{lines.length} รายการ</p>
                  <p className="text-slate-500 text-xs">จาก DW {dwCategories.length} หมวด</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-600 dark:text-slate-400 text-xs">ยอดรวมทั้งสิ้น</p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-black text-2xl">฿{totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Send */}
            <div className="flex gap-3">
              <button onClick={() => setShowQuoteModal(false)}
                className="flex-1 py-3 border border-border text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm cursor-pointer">
                ยกเลิก
              </button>
              <button onClick={handleSendQuotation}
                disabled={lines.every(l => l.price === 0)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl font-bold transition-colors text-sm cursor-pointer shadow-sm shadow-blue-500/10">
                ส่งใบเสนอราคา
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Quotation Detail Modal ─── */}
      {selectedQuotation && selectedQuotation.actionData && (
        (() => {
          const d = selectedQuotation.actionData;
          const { items, days } = parseQuotationDescription(d.description || "");
          const isPending = d.status === "pending";
          const isApproved = d.status === "approved";
          const isRejected = d.status === "rejected";

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-none">
                <div className="flex justify-between items-center mb-5 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-500" />
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{d.title}</h3>
                      <p className="text-[10px] text-slate-500">ส่งเมื่อ {selectedQuotation.timestamp}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedQuotation(null)} 
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Status Badge */}
                <div className="flex justify-between items-center mb-5 p-3 rounded-xl border border-border/40 bg-slate-50 dark:bg-slate-950">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">สถานะใบเสนอราคา</span>
                  {isPending && (
                    <span className="text-xs font-extrabold px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-full animate-pulse">
                      ⏳ รอพิจารณา
                    </span>
                  )}
                  {isApproved && (
                    <span className="text-xs font-extrabold px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-full">
                      ✅ อนุมัติแล้ว
                    </span>
                  )}
                  {isRejected && (
                    <span className="text-xs font-extrabold px-3 py-1 bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 rounded-full">
                      ❌ ถูกตีกลับ
                    </span>
                  )}
                </div>

                {/* Items Breakdown Table */}
                <div className="border border-border rounded-xl overflow-hidden mb-5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900 border-b border-border text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        <th className="p-3">หมวดหมู่</th>
                        <th className="p-3">ชื่อสินค้า / แบรนด์</th>
                        <th className="p-3 text-center">จำนวน</th>
                        <th className="p-3 text-right">ราคา/หน่วย</th>
                        <th className="p-3 text-right">ราคารวม</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-foreground divide-y divide-border/40">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="p-3 font-medium text-slate-500">{item.category}</td>
                          <td className="p-3 font-semibold">{item.name || "—"}</td>
                          <td className="p-3 text-center">{item.qty} {item.unit}</td>
                          <td className="p-3 text-right">฿{item.price.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">
                            ฿{(item.qty * item.price).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Duration & Grand Total Summary */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-950 border border-border/40 p-4 rounded-xl flex flex-col justify-center">
                    <span className="text-[10px] text-slate-500">ระยะเวลาดำเนินงาน</span>
                    <span className="text-lg font-extrabold text-foreground mt-1">{days} วัน</span>
                  </div>
                  <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col justify-center items-end">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">ยอดรวมทั้งสิ้น</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      ฿{d.amount !== undefined ? d.amount.toLocaleString() : "0"}
                    </span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => setSelectedQuotation(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors text-sm cursor-pointer border border-border/40"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </>
  );
}
