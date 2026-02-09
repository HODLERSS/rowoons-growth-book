"use client";

import { useState, useEffect } from "react";
import { AgeInfo } from "@/lib/types";
import { calculateAge, getCurrentMonth } from "@/lib/age-calculator";
import { useBaby } from "@/contexts/baby-context";

const DEFAULT_AGE: AgeInfo = { months: 0, days: 0, totalDays: 0, label: "" };

export function useAge() {
  const { baby } = useBaby();
  const [age, setAge] = useState<AgeInfo>(DEFAULT_AGE);
  const [currentMonth, setCurrentMonth] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!baby) {
      setAge(DEFAULT_AGE);
      setCurrentMonth(1);
      setMounted(true);
      return;
    }

    setAge(calculateAge(baby.birthDate));
    setCurrentMonth(getCurrentMonth(baby.birthDate));
    setMounted(true);

    const interval = setInterval(() => {
      setAge(calculateAge(baby.birthDate));
      setCurrentMonth(getCurrentMonth(baby.birthDate));
    }, 60000);
    return () => clearInterval(interval);
  }, [baby]);

  return { age, currentMonth, mounted };
}
