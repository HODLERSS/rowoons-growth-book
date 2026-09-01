"use client";

import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  const { lang, t } = useLanguage();
  return (
    <span className={cn("font-display font-semibold text-[1.25rem] leading-none tracking-tight", className)} translate="no" lang={lang}>
      {t("app.name")}
    </span>
  );
}
