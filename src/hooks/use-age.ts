"use client";

import { useMemo } from "react";
import { useNow } from "@/lib/store";
import { isBeyondRange, monthForAge } from "@/lib/age-calculator";
import { correctedAge } from "@/lib/corrected-age";
import { useBaby } from "./use-baby";
import type { AgeInfo } from "@/lib/types";

const EMPTY: AgeInfo = { months: 0, days: 0, totalDays: 0, isFuture: false, valid: false };

/**
 * `age` is the chronological age (what parents say out loud). `currentMonth` is the content month,
 * which follows the corrected age for preterm babies until 24 months.
 */
export function useAge() {
  const { baby, hydrated } = useBaby();
  const now = useNow();
  return useMemo(() => {
    const r = baby && now ? correctedAge(baby.birthDate, baby.dueDate, now) : { age: EMPTY, chronological: EMPTY, corrected: false };
    return {
      age: r.chronological,
      correctedAge: r.corrected ? r.age : null,
      currentMonth: baby && now ? monthForAge(r.age) : 1,
      beyondRange: isBeyondRange(r.chronological),
      isFuture: r.chronological.isFuture,
      ready: hydrated && now > 0,
    };
  }, [baby, now, hydrated]);
}
