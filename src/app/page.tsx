"use client";

import { Header } from "@/components/shared/header";
import { AgeDisplay } from "@/components/dashboard/age-display";
import { NotificationBanner } from "@/components/dashboard/notification-banner";
import { MilestoneSummary } from "@/components/dashboard/milestone-summary";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentMemos } from "@/components/dashboard/recent-memos";
import { UpcomingMilestones } from "@/components/dashboard/upcoming-milestones";
import { useLanguage } from "@/contexts/language-context";

export default function DashboardPage() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-full">
      <Header
        title={t("app.title")}
        subtitle={t("app.subtitle")}
      />
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-4 pb-8">
          <AgeDisplay />
          <NotificationBanner />
          <QuickActions />
          <MilestoneSummary />
          <UpcomingMilestones />
          <RecentMemos />
        </div>
      </div>
    </div>
  );
}
