import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/app-shell";
import { APP_URL } from "@/lib/constants";

const display = Noto_Serif_KR({
  weight: ["600"],
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
    { media: "(prefers-color-scheme: light)", color: "#FAF6EE" },
    { media: "(prefers-color-scheme: dark)", color: "#151A16" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Dodam", template: "%s · Dodam" },
  description: "A month-by-month record of your baby's milestones, play ideas and safety notes. 도담 — 한 달 한 달, 도담도담.",
  applicationName: "Dodam",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Dodam" },
  icons: { icon: [{ url: "/favicon-32.png", sizes: "32x32" }, { url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false },
  openGraph: { title: "Dodam", description: "Grow well, one month at a time.", url: APP_URL, siteName: "Dodam", images: ["/og.png"] },
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
