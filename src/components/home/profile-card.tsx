"use client";

import { Pencil } from "lucide-react";
import { SealMark } from "@/components/brand/seal";
import { useBaby, displayName } from "@/hooks/use-baby";
import { useAge } from "@/hooks/use-age";
import { useLanguage } from "@/hooks/use-language";
import { formatDate } from "@/i18n";
import { parseLocalDate } from "@/lib/age-calculator";

export function ProfileCard({ onEdit }: { onEdit: () => void }) {
  const { baby, hydrated } = useBaby();
  const { age, currentMonth, beyondRange, isFuture, ready } = useAge();
  const { lang, t } = useLanguage();

  if (!hydrated) return <div className="h-[104px] rounded-xl border border-rule bg-surface" aria-hidden="true" />;

  if (!baby) {
    return (
      <button type="button" onClick={onEdit} className="flex w-full items-center gap-4 rounded-xl border border-rule bg-surface p-4 text-left hover:bg-hover/50">
        <SealMark size={56} />
        <span className="min-w-0 flex-1">
          <span className="font-display block text-[19px] font-semibold leading-tight">{t("home.setup")}</span>
          <span className="mt-1 block text-[14px] text-muted-foreground">{t("home.setup_hint")}</span>
        </span>
      </button>
    );
  }

  const name = displayName(baby, lang);
  const born = parseLocalDate(baby.birthDate);
  let ageText = "";
  if (ready) {
    if (age.isFuture) ageText = t("age.future");
    else if (age.months === 0) ageText = age.days === 0 ? t("age.today") : age.days === 1 ? t("age.day_only") : t("age.days_only", { days: age.days });
    else if (age.months === 1) ageText = age.days === 0 ? t("age.month_only") : t("age.month_days", { days: age.days });
    else ageText = age.days === 0 ? t("age.months_only", { months: age.months }) : t("age.months_days", { months: age.months, days: age.days });
  }

  return (
    <>
      <button
        type="button"
        onClick={onEdit}
        aria-label={t("home.edit_profile")}
        className="group flex w-full items-center gap-4 rounded-xl border border-rule bg-surface p-4 text-left transition-colors hover:bg-hover/50"
      >
        <SealMark size={56} />
        <span className="min-w-0 flex-1">
          <span className="font-display block truncate text-[22px] font-semibold leading-tight" lang={lang}>
            {name}
          </span>
          <span className="tnum mt-0.5 block text-[15px]">{ageText || " "}</span>
          {born && <span className="tnum mt-0.5 block text-[13px] text-muted-foreground">{t("age.born", { date: formatDate(lang, born) })}</span>}
        </span>
        <span className="flex flex-col items-end gap-2">
          <span className="tnum rounded-full bg-primary px-2.5 py-1 text-[12px] font-semibold text-primary-foreground">{t("age.month_pill", { month: currentMonth })}</span>
          <Pencil className="size-4 text-muted-foreground" aria-hidden="true" />
        </span>
      </button>
      {ready && (beyondRange || isFuture) && (
        <p className="rounded-lg bg-hover px-3 py-2 text-[13px] text-muted-foreground">{beyondRange ? t("age.beyond") : t("age.future")}</p>
      )}
    </>
  );
}
