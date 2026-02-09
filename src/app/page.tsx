"use client";

import { Header } from "@/components/shared/header";
import { AgeDisplay } from "@/components/dashboard/age-display";
import { NotificationBanner } from "@/components/dashboard/notification-banner";
import { MilestoneSummary } from "@/components/dashboard/milestone-summary";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentMemos } from "@/components/dashboard/recent-memos";
import { UpcomingMilestones } from "@/components/dashboard/upcoming-milestones";
import { useLanguage } from "@/contexts/language-context";
import { useBaby } from "@/contexts/baby-context";
import { BabySetupModal } from "@/components/onboarding/baby-setup-modal";

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const { baby } = useBaby();

  return (
    <div className="flex flex-col h-full">
      <BabySetupModal />
      <Header
        title={baby ? `${lang === "ko" ? baby.nameKo || baby.name : baby.name}${t("app.growth_book")}` : t("app.title")}
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
