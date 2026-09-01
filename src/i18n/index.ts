import { josa, type JosaPair } from "@/lib/josa";
import { messages, type MessageKey } from "./messages";

export type Language = "en" | "ko";
export type { MessageKey };

export const LANGUAGES: Language[] = ["en", "ko"];

export function isLanguage(v: unknown): v is Language {
  return v === "en" || v === "ko";
}

/** Detect the first-run language from the browser, defaulting to English. */
export function detectLanguage(navLanguages?: readonly string[]): Language {
  const list = navLanguages ?? (typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : []);
  for (const l of list) {
    if (typeof l === "string" && l.toLowerCase().startsWith("ko")) return "ko";
    if (typeof l === "string" && l.toLowerCase().startsWith("en")) return "en";
  }
  return "en";
}

export type Params = Record<string, string | number>;

const TOKEN = /\{(\w+)((?:\|[^}|]+)*)\}/g;

/**
 * Translate a key with {token} substitution.
 * Modifiers after the token name: `q` wraps the value in the language's quotation marks;
 * a Korean particle pair such as 이/가 appends the correct particle (Korean only).
 */
export function translate(lang: Language, key: MessageKey, params?: Params): string {
  const template = messages[lang][key] ?? messages.en[key] ?? key;
  return template.replace(TOKEN, (whole, name: string, mods: string) => {
    const raw = params?.[name];
    if (raw === undefined) return `{${name}}`;
    let value = String(raw);
    let particle: JosaPair | null = null;
    for (const mod of mods.split("|").filter(Boolean)) {
      if (mod === "q") value = lang === "ko" ? `‘${value}’` : `“${value}”`;
      else if (mod.includes("/")) particle = mod as JosaPair;
    }
    if (particle && lang === "ko") value = josa(value, particle);
    return value;
  });
}

export const LOCALE: Record<Language, string> = { en: "en-US", ko: "ko-KR" };

export function formatDate(lang: Language, date: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE[lang], opts ?? { year: "numeric", month: "long", day: "numeric" }).format(d);
}

export function formatShortDate(lang: Language, date: Date | string | number): string {
  return formatDate(lang, date, { month: "short", day: "numeric" });
}

export function formatNumber(lang: Language, n: number): string {
  return new Intl.NumberFormat(LOCALE[lang]).format(n);
}
