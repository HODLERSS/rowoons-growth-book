"use client";

import { WatchOut } from "@/lib/types";
import { AlertCard } from "./alert-card";
import { useLanguage } from "@/contexts/language-context";

interface AlertListProps {
  watchOuts: WatchOut[];
}

export function AlertList({ watchOuts }: AlertListProps) {
  const { t } = useLanguage();

  if (watchOuts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">✅</span>
        <p className="text-muted-foreground text-sm">
          {t("watchouts.empty")}
        </p>
      </div>
    );
  }

  // Sort: urgent first, then caution, then info
  const severityOrder = { urgent: 0, caution: 1, info: 2 };
  const sorted = [...watchOuts].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return (
    <div className="flex flex-col gap-4">
      {sorted.map((watchOut) => (
        <AlertCard key={watchOut.id} watchOut={watchOut} />
      ))}
    </div>
  );
}
