"use client";

import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === "en" ? "ko" : "en")}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        "bg-muted hover:bg-muted/80 transition-colors active:scale-95"
      )}
      aria-label={lang === "en" ? "Switch to Korean" : "영어로 전환"}
    >
      <span className={cn(lang === "en" ? "opacity-100" : "opacity-40")}>EN</span>
      <span className="text-muted-foreground">/</span>
      <span className={cn(lang === "ko" ? "opacity-100" : "opacity-40")}>KO</span>
    </button>
  );
}
