import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// next/font downloads these at build time and serves them from our own
// origin, so visitors never make a request to Google.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Graphika — publication-ready graphs, privately",
  description:
    "Turn CSV and Excel files into publication-ready figures. Runs entirely in your browser; your data never leaves your device.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full antialiased font-sans", inter.variable, jetbrainsMono.variable)}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
