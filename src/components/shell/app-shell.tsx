"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { isNative } from "@/lib/platform";
import { TabBar } from "./tab-bar";
import { SideNav } from "./side-nav";

/** Keeps <html lang> in sync and registers the service worker on the web. */
function Effects() {
  const { lang } = useLanguage();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  useEffect(() => {
    if (isNative() || !("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const legal = pathname === "/privacy" || pathname === "/terms" || pathname.startsWith("/privacy/") || pathname.startsWith("/terms/");
  return (
    <>
      <Effects />
      <a href="#main" className="skip-link">
        {t("nav.skip")}
      </a>
      <div className="md:flex md:min-h-dvh">
        {!legal && <SideNav />}
        <main id="main" className="flex-1 min-w-0 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-8">
          {children}
        </main>
      </div>
      {!legal && <TabBar />}
    </>
  );
}
