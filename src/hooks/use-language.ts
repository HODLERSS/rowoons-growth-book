"use client";

import { useCallback, useMemo } from "react";
import { KEYS, useStoredValue, writeKey, jsonOr } from "@/lib/store";
import { detectLanguage, isLanguage, translate, type Language, type MessageKey, type Params } from "@/i18n";

const parseLang = (raw: string | null): Language => {
  const stored = jsonOr<Language | null>(null, (v): v is Language | null => v === null || isLanguage(v))(raw);
  return stored ?? detectLanguage();
};

export function useLanguage() {
  const lang = useStoredValue<Language>(KEYS.language, parseLang, "en");
  const setLang = useCallback((next: Language) => writeKey(KEYS.language, next), []);
  const t = useCallback((key: MessageKey, params?: Params) => translate(lang, key, params), [lang]);
  return useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
}
