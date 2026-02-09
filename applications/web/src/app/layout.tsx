import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { prefetchProjects } from "@/lib/api.server";
import { cn } from "@/lib/cn";
import { Providers } from "./providers";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

const themeScript = `
  (function() {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const projects = await prefetchProjects();

  return (
    <html
      className={cn(geist.variable, geistMono.variable)}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-bg font-sans text-[0.75rem] text-text antialiased">
        <Providers fallback={{ projects }}>{children}</Providers>
      </body>
    </html>
  );
}
