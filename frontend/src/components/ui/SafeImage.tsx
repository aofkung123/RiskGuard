"use client";

import React, { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { Building2, ImageOff, UserRound } from "lucide-react";

type FallbackKind = "cover" | "avatar" | "image";

interface SafeImageProps extends Omit<ImageProps, "src" | "alt" | "onError"> {
  src?: string | null;
  alt: string;
  fallbackKind?: FallbackKind;
  fallbackLabel?: string;
}

const FALLBACK_ICON = {
  cover: Building2,
  avatar: UserRound,
  image: ImageOff,
} as const;

export default function SafeImage({
  src,
  alt,
  fallbackKind = "image",
  fallbackLabel,
  className = "",
  style,
  ...imageProps
}: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const failed = !normalizedSrc || failedSrc === normalizedSrc;
  const Icon = FALLBACK_ICON[fallbackKind];
  const label = fallbackLabel || (fallbackKind === "avatar" ? "ไม่มีรูปโปรไฟล์" : "ไม่มีรูปภาพ");

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt || label}
        className={`flex flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600 ${className}`}
        style={style}
      >
        <Icon className={fallbackKind === "avatar" ? "h-1/2 w-1/2 max-h-8 max-w-8" : "h-8 w-8"} aria-hidden="true" />
        {fallbackKind !== "avatar" && <span className="text-xs font-medium">{label}</span>}
      </div>
    );
  }

  return (
    <Image
      {...imageProps}
      src={normalizedSrc}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailedSrc(normalizedSrc)}
    />
  );
}
