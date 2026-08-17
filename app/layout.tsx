import type { Metadata } from "next";
import { spaceGroteskBold, spaceGroteskRegular, inter } from "./fonts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Web3Providers } from "@/app/providers";
import { RefluxChatbot } from "@/components/ai/RefluxChatbot";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reflux Protocol — Institutional Invoice Credit on X Layer",
  description:
    "Reflux tokenizes real business invoices into investable onchain credit. Powered by Gemini AI risk pricing and OKX L2 settlement.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGroteskBold.variable} ${spaceGroteskRegular.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-full flex flex-col bg-[#121517] text-[#F2FBF9] relative selection:bg-[#98FFE8] selection:text-[#161A1D]">
        {/* Animated Dynamic Ambient Background & Grid Overlay */}
        <div className="fixed inset-0 bg-grid-pattern pointer-events-none z-0 opacity-80" />
        <div className="reflux-glow-orb-1" />
        <div className="reflux-glow-orb-2" />
        <div className="reflux-glow-orb-3" />

        {/* Protocol Application Wrapper */}
        <Web3Providers>
          <div className="relative z-10 flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 pt-20">{children}</main>
            <Footer />
            <RefluxChatbot />
          </div>
        </Web3Providers>
      </body>
    </html>
  );
}
