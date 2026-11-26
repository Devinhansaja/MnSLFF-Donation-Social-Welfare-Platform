import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { getLang } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MnSLFF — Minnesota Sri Lanka Friendship Foundation",
    template: "%s | MnSLFF",
  },
  description:
    "Connecting global generosity with verified community projects in Sri Lanka. Every project is visible. Every donation is accountable.",
  openGraph: {
    type: "website",
    siteName: "Minnesota Sri Lanka Friendship Foundation",
    images: ["/images/photos/13-slk-lg.jpg"],
  },
  icons: { icon: "/brand/mark.png" },
};

export const viewport: Viewport = {
  themeColor: "#185C44",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${inter.variable} ${playfair.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
