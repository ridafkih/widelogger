import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={geist.className}>
      <body className="text-[0.75rem] text-text bg-bg antialiased">{children}</body>
    </html>
  );
}
