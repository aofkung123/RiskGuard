"use client";
import React, { useState } from 'react';
import { Send, Paperclip, FileText, MoreVertical } from 'lucide-react';

export default function ChatInterface() {
  const [message, setMessage] = useState('');
  
  const messages = [
    { id: 1, sender: 'employer', text: "สวัสดีครับ! ผมแนบพิมพ์เขียวสำหรับโครงการวิลล่าใหม่มาให้ รบกวนช่วยดูและประเมินราคาคร่าวๆ ให้หน่อยครับ?", time: '10:30 AM' },
    { id: 2, sender: 'employer', type: 'file', fileName: 'villa_blueprint_v2.pdf', fileSize: '4.2 MB', time: '10:31 AM' },
    { id: 3, sender: 'contractor', text: "รับทราบครับ! กำลังตรวจสอบรายละเอียดอยู่ครับ การออกแบบหลังคาดูซับซ้อนนิดหน่อย ผมต้องคำนวณความต้องการเหล็กโครงสร้างเป็นพิเศษครับ", time: '10:45 AM' },
    { id: 4, sender: 'contractor', text: "ผมจะส่งใบเสนอราคาเบื้องต้นให้ภายในบ่ายวันนี้ครับ", time: '10:46 AM' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-slate-950 font-bold">JD</div>
          <div>
            <h3 className="font-bold">จิรายุ ดีไซน์ (ผู้รับเหมา)</h3>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> ออนไลน์
            </p>
          </div>
        </div>
        <button className="p-2 text-slate-500 hover:text-white">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'employer' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] space-y-1`}>
              {msg.type === 'file' ? (
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl flex items-center gap-4 hover:bg-slate-700 transition-colors cursor-pointer group">
                  <div className="p-3 bg-red-500/10 rounded-xl">
                    <FileText className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold group-hover:text-amber-500 transition-colors">{msg.fileName}</p>
                    <p className="text-xs text-slate-500">{msg.fileSize}</p>
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'employer' 
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none' 
                    : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                }`}>
                  {msg.text}
                </div>
              )}
              <p className={`text-[10px] text-slate-500 font-medium ${msg.sender === 'employer' ? 'text-right' : 'text-left'}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-3 bg-slate-800 rounded-2xl px-4 py-2 border border-slate-700 focus-within:border-amber-500/50 transition-all">
          <button className="p-2 text-slate-400 hover:text-amber-500 transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            placeholder="พิมพ์ข้อความที่นี่..." 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2"
          />
          <button className="bg-amber-500 text-slate-900 p-2 rounded-xl hover:bg-amber-400 transition-all active:scale-95 disabled:opacity-50" disabled={!message}>
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
