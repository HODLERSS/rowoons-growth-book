"use client";

import { useMemo } from "react";
import { useNow } from "@/lib/store";
import { calculateAge, isBeyondRange, monthForAge } from "@/lib/age-calculator";
import { useBaby } from "./use-baby";
import type { AgeInfo } from "@/lib/types";

const EMPTY: AgeInfo = { months: 0, days: 0, totalDays: 0, isFuture: false, valid: false };

export function useAge() {
  const { baby, hydrated } = useBaby();
  const now = useNow();
  return useMemo(() => {
    const age = baby && now ? calculateAge(baby.birthDate, now) : EMPTY;
    return {
      age,
      currentMonth: baby && now ? monthForAge(age) : 1,
      beyondRange: isBeyondRange(age),
      isFuture: age.isFuture,
      ready: hydrated && now > 0,
    };
  }, [baby, now, hydrated]);
}
