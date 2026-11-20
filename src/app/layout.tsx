import type { Metadata, Viewport } from "next";
import { Fredoka, JetBrains_Mono, Nunito } from "next/font/google";
import "./globals.css";

// Round, bubbly fonts: Nunito for text, Fredoka for headings and numbers.
const inter = Nunito({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const display = Fredoka({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Charu's Dashboard",
  description: "Personal daily planner dashboard",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Charu's Dashboard", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#070912",
  width: "device-width", initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} ${display.variable} antialiased`}>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}` }} />
      </body>
    </html>
  );
}
