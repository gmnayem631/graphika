import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// next/font downloads these at build time and serves them from our own
// origin, so visitors never make a request to Google.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

/**
 * Content Security Policy for the page (production only; dev tooling needs eval).
 * connect-src 'self' means page scripts can only talk to this site, so even a
 * buggy or compromised dependency can't send user data elsewhere. Pyodide is
 * downloaded by the chart worker, whose policy comes from the server's headers
 * rather than this tag (see README › Privacy). 'unsafe-inline' scripts are
 * required by Next.js static export's inline bootstrap.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

/**
 * Runs before first paint: apply the saved theme (or the system preference)
 * so the page never flashes the wrong colours. Kept in sync with ThemeToggle.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export const metadata: Metadata = {
  title: "Graphika — publication-ready graphs, privately",
  description:
    "Turn CSV and Excel files into publication-ready figures. Runs entirely in your browser; your data never leaves your device.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full antialiased font-sans", inter.variable, jetbrainsMono.variable)}
    >
      <head>
        {process.env.NODE_ENV === "production" && <meta httpEquiv="Content-Security-Policy" content={CSP} />}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
