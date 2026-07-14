"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) {
      router.replace("/login");
    } else if (role === "employer") {
      router.replace("/employer/chat");
    } else if (role === "contractor") {
      router.replace("/contractor/chat");
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-500" />
    </div>
  );
}
