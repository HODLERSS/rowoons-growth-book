"use client";

import { useCallback, useMemo } from "react";
import { KEYS, readKey, useStoredValue, writeKey, jsonOr } from "@/lib/store";
import { isCompletion } from "@/lib/backup";
import type { MilestoneCompletion } from "@/lib/types";

const parse = jsonOr<MilestoneCompletion>({}, isCompletion);

export function useMilestones() {
  const completions = useStoredValue<MilestoneCompletion>(KEYS.milestones, parse, {});

  const toggle = useCallback((id: string): boolean => {
    const current = { ...readKey(KEYS.milestones, parse) };
    const wasDone = current[id]?.completed ?? false;
    if (wasDone) delete current[id];
    else current[id] = { completed: true, completedAt: new Date().toISOString() };
    writeKey(KEYS.milestones, current);
    return !wasDone;
  }, []);

  const isCompleted = useCallback((id: string) => completions[id]?.completed ?? false, [completions]);
  const completedAt = useCallback((id: string) => completions[id]?.completedAt ?? null, [completions]);

  const stats = useCallback(
    (ids: string[]) => {
      const done = ids.filter((id) => completions[id]?.completed).length;
      return { done, total: ids.length, percentage: ids.length ? Math.round((done / ids.length) * 100) : 0 };
    },
    [completions]
  );

  return useMemo(() => ({ completions, toggle, isCompleted, completedAt, stats }), [completions, toggle, isCompleted, completedAt, stats]);
}
