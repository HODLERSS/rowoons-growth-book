"use client";

import { useCallback, useMemo } from "react";
import { KEYS, readKey, useStoredValue, writeKey, jsonOr } from "@/lib/store";
import { isMemoArray } from "@/lib/backup";
import type { Memo } from "@/lib/types";

const parse = jsonOr<Memo[]>([], isMemoArray);

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useMemos() {
  const raw = useStoredValue<Memo[]>(KEYS.memos, parse, []);
  const memos = useMemo(() => raw.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), [raw]);

  const get = useCallback((id: string) => raw.find((m) => m.id === id), [raw]);

  const create = useCallback((memo: Omit<Memo, "id" | "createdAt" | "updatedAt">): Memo => {
    const now = new Date().toISOString();
    const entry: Memo = { ...memo, id: newId(), createdAt: now, updatedAt: now };
    writeKey(KEYS.memos, [...readKey(KEYS.memos, parse), entry]);
    return entry;
  }, []);

  const update = useCallback((id: string, updates: Partial<Omit<Memo, "id" | "createdAt">>): Memo | undefined => {
    const list = readKey(KEYS.memos, parse);
    const i = list.findIndex((m) => m.id === id);
    if (i === -1) return undefined;
    const next = list.slice();
    next[i] = { ...next[i], ...updates, updatedAt: new Date().toISOString() };
    writeKey(KEYS.memos, next);
    return next[i];
  }, []);

  const remove = useCallback((id: string): boolean => {
    const list = readKey(KEYS.memos, parse);
    const next = list.filter((m) => m.id !== id);
    if (next.length === list.length) return false;
    writeKey(KEYS.memos, next);
    return true;
  }, []);

  return useMemo(() => ({ memos, get, create, update, remove }), [memos, get, create, update, remove]);
}
