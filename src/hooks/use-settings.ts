"use client";

import { useCallback, useMemo } from "react";
import { KEYS, readKey, useStoredValue, writeKey, jsonOr } from "@/lib/store";
import type { Settings } from "@/lib/types";

const DEFAULTS: Settings = { reminders: false, notifyDismissed: false };
const parse = (raw: string | null): Settings => ({ ...DEFAULTS, ...jsonOr<Partial<Settings>>({})(raw) });

export function useSettings() {
  const settings = useStoredValue<Settings>(KEYS.settings, parse, DEFAULTS);
  const update = useCallback((patch: Partial<Settings>) => {
    writeKey(KEYS.settings, { ...readKey(KEYS.settings, parse), ...patch });
  }, []);
  return useMemo(() => ({ settings, update }), [settings, update]);
}
