"use client";

import { useCallback, useMemo } from "react";
import { KEYS, readKey, useStoredValue, writeKey, jsonOr } from "@/lib/store";

const parse = jsonOr<string[]>([], (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string"));

/** Watch-outs the parent has acknowledged ("Got it"); they stop being previewed or pushed. */
export function useAcks() {
  const acks = useStoredValue<string[]>(KEYS.acks, parse, []);
  const ack = useCallback((id: string) => {
    const cur = readKey(KEYS.acks, parse);
    if (!cur.includes(id)) writeKey(KEYS.acks, [...cur, id]);
  }, []);
  return useMemo(() => ({ acks, ack, isAcked: (id: string) => acks.includes(id) }), [acks, ack]);
}

export function readAcks(): Set<string> {
  return new Set(readKey(KEYS.acks, parse));
}
