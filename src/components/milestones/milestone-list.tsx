"use client";

import { useState, useCallback } from "react";
import { CATEGORY_ORDER } from "@/lib/constants";
import type { Milestone, MilestoneCategory } from "@/lib/types";
import { useMilestones } from "@/hooks/use-milestones";
import { useLanguage } from "@/hooks/use-language";
import { hapticTap } from "@/lib/platform";
import { CATEGORY_ICON } from "@/components/tags";
import { MilestoneRow } from "./milestone-row";

/** Shared toggle-with-stamp behaviour. */
export function useStamp() {
  const { toggle, isCompleted, completedAt } = useMilestones();
  const [stamping, setStamping] = useState<string | null>(null);
  const onToggle = useCallback(
    (id: string) => {
      const nowDone = toggle(id);
      setStamping(nowDone ? id : null);
      void hapticTap(nowDone ? "success" : "light");
    },
    [toggle]
  );
  return { onToggle, isCompleted, completedAt, stamping };
}

export function MilestoneSections({ byCategory }: { byCategory: Record<MilestoneCategory, Milestone[]> }) {
  const { t } = useLanguage();
  const { onToggle, isCompleted, completedAt, stamping } = useStamp();
  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((cat) => {
        const list = byCategory[cat];
        if (list.length === 0) return null;
        const Icon = CATEGORY_ICON[cat];
        return (
          <section key={cat} aria-labelledby={`cat-${cat}`} className="rounded-xl border border-rule bg-surface px-4">
            <h2 id={`cat-${cat}`} className="flex h-12 items-center gap-2 border-b border-rule text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <Icon className="size-4" aria-hidden="true" />
              {t(`category.${cat}`)}
              <span className="tnum ml-auto font-medium">{t("milestones.count", { count: list.length })}</span>
            </h2>
            <ul>
              {list.map((m) => (
                <MilestoneRow key={m.id} milestone={m} done={isCompleted(m.id)} doneAt={completedAt(m.id)} stamping={stamping === m.id} onToggle={onToggle} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
