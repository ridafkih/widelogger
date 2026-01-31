import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/cn";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn(geist.variable, geistMono.variable)}>
      <body className="font-sans text-[0.75rem] text-text bg-bg antialiased">{children}</body>
    </html>
  );
}
