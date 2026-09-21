import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/app-shell";
import { APP_URL } from "@/lib/constants";

const display = Nunito({
  weight: ["700", "800"],
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1512" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Sprout", template: "%s · Sprout" },
  description: "A month-by-month record of your baby's milestones, play ideas and safety notes. 새싹 — 한 잎, 한 잎 자라요.",
  applicationName: "Sprout",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Sprout" },
  icons: { icon: [{ url: "/favicon-32.png", sizes: "32x32" }, { url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false },
  // The card is the only context a link preview gives, so the description says what the app is rather
  // than repeating the tagline. Without an explicit twitter block X renders a small square card.
  openGraph: {
    type: "website",
    title: "Sprout · 새싹",
    description: "Milestones, play and safety for your baby's first 36 months, month by month. Free, in English and Korean.",
    url: APP_URL,
    siteName: "Sprout",
    locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Sprout · 새싹 — milestones, play and safety, month by month" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sprout · 새싹",
    description: "Milestones, play and safety for your baby's first 36 months. Free, in English and Korean.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={display.variable}>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
