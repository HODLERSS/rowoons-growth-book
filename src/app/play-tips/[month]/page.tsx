"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getCurrentMonth } from "@/lib/age-calculator";
import { getPlayTips } from "@/lib/content-loader";
import { useLanguage } from "@/contexts/language-context";
import { Header } from "@/components/shared/header";
import { MonthNavigator } from "@/components/shared/month-navigator";
import { MonthlyNote } from "@/components/shared/monthly-note";
import { TipList } from "@/components/play-tips/tip-list";

export default function PlayTipsPage() {
  const params = useParams();
  const router = useRouter();
  const monthParam = params.month as string;
  const { lang, t } = useLanguage();

  useEffect(() => {
    if (monthParam === "current") {
      router.replace(`/play-tips/${getCurrentMonth()}`);
    }
  }, [monthParam, router]);

  if (monthParam === "current") {
    return null;
  }

  const month = parseInt(monthParam, 10);
  const tips = getPlayTips(month, lang);

  return (
    <div className="flex flex-col h-full">
      <Header
        title={t("playtips.title")}
        subtitle={t("playtips.subtitle").replace("{month}", String(month))}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <MonthNavigator basePath="/play-tips" selectedMonth={month} />
          <MonthlyNote month={month} variant="play-tips" />
          <TipList tips={tips} />
        </div>
      </div>
    </div>
  );
}
