"use client";

import { useCallback, useMemo } from "react";
import { KEYS, useStoredValue, writeKey, jsonOr, useHydrated } from "@/lib/store";
import { isBabyInfo } from "@/lib/backup";
import type { BabyInfo } from "@/lib/types";
import type { Language } from "@/i18n";

const parseBaby = jsonOr<BabyInfo | null>(null, (v): v is BabyInfo | null => v === null || isBabyInfo(v));

const HANGUL = /[가-힣]/;

/** Pick the name that matches the UI language's script when two are stored. */
export function displayName(baby: BabyInfo | null, lang: Language): string {
  if (!baby) return "";
  const names = [baby.name, baby.nameKo].filter((n): n is string => !!n && n.trim().length > 0);
  if (names.length === 0) return "";
  const hangul = names.find((n) => HANGUL.test(n));
  const latin = names.find((n) => !HANGUL.test(n));
  if (lang === "ko") return hangul ?? names[0];
  return latin ?? names[0];
}

export function useBaby() {
  const baby = useStoredValue<BabyInfo | null>(KEYS.profile, parseBaby, null);
  const hydrated = useHydrated();
  const setBaby = useCallback((info: BabyInfo) => writeKey(KEYS.profile, info), []);
  return useMemo(() => ({ baby, setBaby, hasBaby: baby !== null, hydrated }), [baby, setBaby, hydrated]);
}
