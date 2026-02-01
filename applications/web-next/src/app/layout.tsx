import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/cn";
import { Providers } from "./providers";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

const themeScript = `
  (function() {
    const theme = localStorage.getItem('theme');
    const isDark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  })();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn(geist.variable, geistMono.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans text-[0.75rem] text-text bg-bg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
