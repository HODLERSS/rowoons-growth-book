"use client";

import { useState, useEffect } from "react";
import { AgeInfo } from "@/lib/types";
import { calculateAge, getCurrentMonth } from "@/lib/age-calculator";

const DEFAULT_AGE: AgeInfo = { months: 0, days: 0, totalDays: 0, label: "" };

export function useAge() {
  const [age, setAge] = useState<AgeInfo>(DEFAULT_AGE);
  const [currentMonth, setCurrentMonth] = useState(9);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAge(calculateAge());
    setCurrentMonth(getCurrentMonth());
    setMounted(true);

    const interval = setInterval(() => {
      setAge(calculateAge());
      setCurrentMonth(getCurrentMonth());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return { age, currentMonth, mounted };
}
