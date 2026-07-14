import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

import ThemeScript from "@/components/ThemeScript";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RiskGuard",
    template: "%s | RiskGuard",
  },
  description: "แพลตฟอร์มบริหารความเสี่ยงโครงการก่อสร้างด้านต้นทุน เวลา และการสื่อสาร",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${kanit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
