"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Paperclip, CheckCircle2, XCircle,
  FileText, Image as ImageIcon, Loader2, X
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
  sender: "me" | "contractor";
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

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

function getInitialContractorId() {
  if (typeof window === "undefined") return null;
  const cid = new URLSearchParams(window.location.search).get("contractorId");
  if (!cid) return null;
  const parsed = parseInt(cid, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

// ─── Quotation Card ───────────────────────────────────────────────────────────
const QuotationCard = ({
  msg,
  onApprove,
  onReject,
  onViewDetail,
}: {
  msg: Message;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetail?: (msg: Message) => void;
}) => {
  const d = msg.actionData;
  if (!d) return null;
  const isPending  = d.status === "pending";
  const isApproved = d.status === "approved";
  const isRejected = d.status === "rejected";

  const { items, days } = parseQuotationDescription(d.description || "");

  return (
    <div 
      onClick={() => onViewDetail && onViewDetail(msg)}
      className="bg-card border border-amber-500/30 rounded-2xl p-5 w-80 shadow-xl shadow-amber-500/5 hover:scale-[1.02] hover:border-amber-500/50 hover:shadow-amber-500/10 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0" />
          <span className="font-bold text-foreground text-sm leading-tight group-hover:text-amber-500 transition-colors">{d.title}</span>
        </div>
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

      <div className="flex justify-between items-center text-[10px] text-slate-500 mb-3 bg-slate-500/5 px-2.5 py-1.5 rounded-lg border border-border/40">
        <span>⏱️ ระยะเวลาดำเนินงาน:</span>
        <span className="font-semibold text-foreground">{days} วัน</span>
      </div>

      {d.amount !== undefined && (
        <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 mb-4 flex justify-between items-center border border-border/40">
          <span className="text-slate-500 text-xs">ยอดรวมทั้งสิ้น</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-black text-xl">
            ฿{d.amount.toLocaleString()}
          </span>
        </div>
      )}

      {isPending && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onApprove(msg.id); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-400 hover:text-white dark:hover:text-slate-900 border border-emerald-500/30 dark:border-emerald-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติ
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onReject(msg.id); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500/10 hover:bg-red-600 text-red-700 dark:text-red-400 hover:text-white border border-red-500/30 dark:border-red-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" /> ตีกลับ
            </button>
          </div>
          <div className="text-[10px] text-center text-slate-500 py-1 bg-slate-500/5 rounded-lg border border-border/30 animate-pulse">
            🔍 คลิกเพื่อดูรายละเอียดใบเสนอราคา
          </div>
        </div>
      )}

      {isApproved && (
        <div className="flex items-center justify-center gap-2 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">อนุมัติแล้ว</span>
        </div>
      )}

      {isRejected && (
        <div className="flex items-center justify-center gap-2 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-red-750 dark:text-red-400 font-bold">ตีกลับแล้ว</span>
        </div>
      )}
    </div>
  );
};

// ─── Main Chat Page ───────────────────────────────────────────────────────────
export default function EmployerChatPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');
  const [token] = useState<string | null>(getStoredToken);
  const [myId, setMyId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) { window.location.href = "/login"; return; }
    fetch(`${API}/api/profile/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.id) setMyId(d.id); else window.location.href = "/login"; })
      .catch(() => { localStorage.removeItem("token"); window.location.href = "/login"; });
  }, [API, token]);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contractorId, setContractorId] = useState<number | null>(getInitialContractorId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [sendingImage, setSendingImage] = useState(false);
  const [selectedChatFile, setSelectedChatFile] = useState<File | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Message | null>(null);

  const fetchContacts = useCallback(() => {
    if (!myId) return;
    fetch(`${API}/api/chat/contacts?user_id=${myId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: Contact[]) => {
        setContacts(data);
        setLoadingContacts(false);
        if (data.length > 0 && !contractorId) {
          setContractorId(data[0].id);
        }
      })
      .catch(() => setLoadingContacts(false));
  }, [API, myId, contractorId, token]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // ── Fetch messages ──────────────────────────────────────────────────────────
  const fetchMessages = useCallback(() => {
    if (!contractorId || !myId) return;
    fetch(`${API}/api/chat/messages?user1=${myId}&user2=${contractorId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: MessageResponse[]) => {
        const mapped = data.map(m => ({
          ...m,
          sender: m.sender_id === myId ? "me" : "contractor",
        })) as Message[];
        setMessages(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [contractorId, API, myId, token]);

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

  const handleSend = () => {
    if (!inputText.trim() || !contractorId) return;
    const text = inputText.trim();
    setInputText("");
    fetch(`${API}/api/chat/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ receiver_id: contractorId, content: text, type: "text" }),
    }).then(fetchMessages).catch(() => setInputText(text));
  };

  const handleSendImage = async () => {
    if (!contractorId) return;
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
          receiver_id: contractorId,
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

  const handleApprove = (id: string) => {
    fetch(`${API}/api/chat/action`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message_id: id, action: "approve" }),
    }).then(fetchMessages).catch(() => alert("อนุมัติไม่สำเร็จ กรุณาลองใหม่"));
  };

  const handleReject = (id: string) => {
    fetch(`${API}/api/chat/action`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message_id: id, action: "reject" }),
    }).then(fetchMessages).catch(() => alert("ปฏิเสธไม่สำเร็จ กรุณาลองใหม่"));
  };

  const activeContact = contacts.find(c => c.id === contractorId);

  // ── Render messages ─────────────────────────────────────────────────────────
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
            <span className="text-[10px] text-slate-500 dark:text-slate-450 mt-1 px-1">{msg.timestamp}</span>
          </div>
        </div>
      );
    }

    if (msg.type === "text") {
      return (
        <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
          <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              isMe
                ? "bg-amber-500 text-slate-900 rounded-tr-none"
                : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-border"
            }`}>
              {msg.text}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-450 mt-1 px-1">{msg.timestamp}</span>
          </div>
        </div>
      );
    }

    if (msg.type === "system_update") {
      return (
        <div className="flex justify-center">
          <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5 text-sm text-blue-705 dark:text-blue-300 max-w-sm">
            <span className="shrink-0">🔔</span>
            <span>{msg.text}</span>
          </div>
        </div>
      );
    }

    if (msg.type === "quotation") {
      return (
        <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
          <QuotationCard msg={msg} onApprove={handleApprove} onReject={handleReject} onViewDetail={setSelectedQuotation} />
        </div>
      );
    }

    return null;
  };

  if (!myId) return <div className="p-8 text-center text-slate-500 dark:text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>;

  return (
    <>
      <div className="h-[calc(100vh-6rem)] flex bg-background border border-border rounded-2xl overflow-hidden shadow-sm">

        {/* ── Sidebar ── */}
        <div className="w-72 shrink-0 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border flex-shrink-0">
            <h2 className="text-foreground font-bold">รายการสนทนา</h2>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-none">
            {loadingContacts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-slate-400 dark:text-slate-600 animate-spin" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-slate-600 dark:text-slate-400 text-sm">ยังไม่มีการสนทนา</p>
                <p className="text-slate-500 dark:text-slate-450 text-xs mt-1">รอผู้รับเหมาติดต่อคุณ</p>
              </div>
            ) : (
              contacts.map(c => (
                <div
                  key={c.id}
                  onClick={() => { if (contractorId !== c.id) { setContractorId(c.id); setMessages([]); } }}
                  className={`p-4 flex items-center gap-3 cursor-pointer border-b border-border/50 transition-colors
                    ${contractorId === c.id ? "bg-amber-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}
                >
                  <SafeImage src={c.avatar} alt={c.name} width={40} height={40} unoptimized fallbackKind="avatar" className="w-10 h-10 rounded-full border border-border object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${contractorId === c.id ? "text-amber-600 dark:text-amber-400 font-bold" : "text-foreground"}`}>{c.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-450 capitalize">{c.role}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Main Chat ── */}
        <div className="flex-1 flex flex-col min-w-0">

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
              <p className="text-slate-500 text-sm">เลือกผู้รับเหมาเพื่อเริ่มสนทนา</p>
            )}
            <button
              onClick={() => setShowImageUploader(true)}
              disabled={!activeContact}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 border border-border px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer"
              title="ส่งรูปภาพ"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleChatScroll}
            className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-5 bg-slate-50/50 dark:bg-slate-950"
          >
            {!activeContact ? (
              <div className="text-center text-slate-500 dark:text-slate-600 pt-16 text-sm">
                เลือกผู้รับเหมาจากรายการด้านซ้ายเพื่อเริ่มสนทนา
              </div>
            ) : loading ? (
              <div className="flex justify-center pt-16">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-600 pt-16 text-sm">ยังไม่มีข้อความ เริ่มสนทนาได้เลย</div>
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
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-border rounded-full py-2.5 px-5 text-foreground text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || !activeContact}
                className="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-slate-900 rounded-full transition-colors shrink-0 cursor-pointer shadow-sm shadow-amber-500/10"
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
                <ImageIcon className="w-5 h-5 text-amber-500" /> ส่งรูปภาพ
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
                  className="w-full bg-white dark:bg-slate-900 border border-border rounded-lg px-3 py-2 text-foreground text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:outline-none focus:border-amber-500"
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
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-slate-900 rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/10">
                  {sendingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sendingImage ? "กำลังส่ง..." : "ส่งรูปภาพ"}
                </button>
              </div>
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
                    <FileText className="w-6 h-6 text-amber-500" />
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
                    <span className="text-xs font-extrabold px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-550 border border-amber-500/20 rounded-full animate-pulse">
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
                  {isPending ? (
                    <>
                      <button 
                        onClick={() => {
                          handleApprove(selectedQuotation.id);
                          setSelectedQuotation(null);
                        }}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all text-sm cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10"
                      >
                        <CheckCircle2 className="w-4 h-4" /> อนุมัติใบเสนอราคา
                      </button>
                      <button 
                        onClick={() => {
                          handleReject(selectedQuotation.id);
                          setSelectedQuotation(null);
                        }}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all text-sm cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10"
                      >
                        <XCircle className="w-4 h-4" /> ตีกลับใบเสนอราคา
                      </button>
                      <button 
                        onClick={() => setSelectedQuotation(null)}
                        className="py-3 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors text-sm cursor-pointer border border-border/40"
                      >
                        ยกเลิก
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setSelectedQuotation(null)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors text-sm cursor-pointer border border-border/40"
                    >
                      ปิดหน้าต่าง
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      )}
    </>
  );
}
