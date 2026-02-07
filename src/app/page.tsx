"use client";

import { Header } from "@/components/shared/header";
import { AgeDisplay } from "@/components/dashboard/age-display";
import { MilestoneSummary } from "@/components/dashboard/milestone-summary";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentMemos } from "@/components/dashboard/recent-memos";
import { UpcomingMilestones } from "@/components/dashboard/upcoming-milestones";

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Rowoon's Growth Book"
        subtitle="Track milestones, activities, and memories"
      />
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-4 pb-8">
          <AgeDisplay />
          <QuickActions />
          <MilestoneSummary />
          <UpcomingMilestones />
          <RecentMemos />
        </div>
      </div>
    </div>
  );
}
