"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useEffect } from "react";
import { Header } from "@/components/shared/header";
import { MonthNavigator } from "@/components/shared/month-navigator";
import { MilestoneProgress } from "@/components/milestones/milestone-progress";
import { CategorySection } from "@/components/milestones/category-section";
import { useMilestones } from "@/hooks/use-milestones";
import { getMilestones, getMilestonesByCategory } from "@/lib/content-loader";
import { getCurrentMonth } from "@/lib/age-calculator";
import { MILESTONE_CATEGORIES } from "@/lib/constants";

export default function MilestonesPage() {
  const params = useParams<{ month: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params.month === "current") {
      router.replace(`/milestones/${getCurrentMonth()}`);
    }
  }, [params.month, router]);

  const month = params.month === "current" ? getCurrentMonth() : Number(params.month);
  const { toggle, isCompleted, stats } = useMilestones();

  const milestones = useMemo(() => getMilestones(month), [month]);
  const byCategory = useMemo(() => getMilestonesByCategory(month), [month]);
  const milestoneIds = useMemo(() => milestones.map((m) => m.id), [milestones]);
  const completionStats = stats(milestoneIds);

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Milestones - Month ${month}`}
        subtitle={`${milestones.length} developmental milestones`}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6 max-w-2xl mx-auto">
          <MonthNavigator basePath="/milestones" selectedMonth={month} />

          {milestones.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-4xl">🌱</p>
              <p className="text-muted-foreground text-sm">
                No milestones for month {month} yet.
              </p>
            </div>
          ) : (
            <>
              <MilestoneProgress
                completed={completionStats.completed}
                total={completionStats.total}
                percentage={completionStats.percentage}
              />

              <div className="space-y-6">
                {MILESTONE_CATEGORIES.map((cat) => (
                  <CategorySection
                    key={cat.value}
                    category={cat.value}
                    milestones={byCategory[cat.value]}
                    isCompleted={isCompleted}
                    onToggle={toggle}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
