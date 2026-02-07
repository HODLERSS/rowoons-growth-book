"use client";

import { useState, useCallback, useEffect } from "react";
import { MilestoneCompletion } from "@/lib/types";
import {
  getMilestoneCompletion,
  toggleMilestoneCompletion,
} from "@/lib/milestone-storage";

export function useMilestones() {
  const [completions, setCompletions] = useState<MilestoneCompletion>({});

  useEffect(() => {
    setCompletions(getMilestoneCompletion());
  }, []);

  const toggle = useCallback((milestoneId: string) => {
    toggleMilestoneCompletion(milestoneId);
    setCompletions(getMilestoneCompletion());
  }, []);

  const isCompleted = useCallback(
    (milestoneId: string) => completions[milestoneId]?.completed ?? false,
    [completions]
  );

  const stats = useCallback(
    (milestoneIds: string[]) => {
      const completed = milestoneIds.filter(
        (id) => completions[id]?.completed
      ).length;
      return {
        completed,
        total: milestoneIds.length,
        percentage: milestoneIds.length > 0 ? Math.round((completed / milestoneIds.length) * 100) : 0,
      };
    },
    [completions]
  );

  return { completions, toggle, isCompleted, stats };
}
