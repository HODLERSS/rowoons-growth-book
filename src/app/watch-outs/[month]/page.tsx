"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getCurrentMonth } from "@/lib/age-calculator";
import { getWatchOuts } from "@/lib/content-loader";
import { Header } from "@/components/shared/header";
import { MonthNavigator } from "@/components/shared/month-navigator";
import { MonthlyNote } from "@/components/shared/monthly-note";
import { AlertList } from "@/components/watch-outs/alert-list";

export default function WatchOutsPage() {
  const params = useParams();
  const router = useRouter();
  const monthParam = params.month as string;

  useEffect(() => {
    if (monthParam === "current") {
      router.replace(`/watch-outs/${getCurrentMonth()}`);
    }
  }, [monthParam, router]);

  if (monthParam === "current") {
    return null;
  }

  const month = parseInt(monthParam, 10);
  const watchOuts = getWatchOuts(month);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Watch-Outs"
        subtitle={`Safety notes for month ${month}`}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <MonthNavigator basePath="/watch-outs" selectedMonth={month} />
          <MonthlyNote month={month} variant="watch-outs" />
          <AlertList watchOuts={watchOuts} />
        </div>
      </div>
    </div>
  );
}
