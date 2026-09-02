"use client";

import { Pencil } from "lucide-react";
import { LeafMark } from "@/components/brand/leaf";
import { useBaby, displayName, nameLang } from "@/hooks/use-baby";
import { useAge } from "@/hooks/use-age";
import { useLanguage } from "@/hooks/use-language";
import { formatDate } from "@/i18n";
import { parseLocalDate } from "@/lib/age-calculator";

export function ProfileCard({ onEdit }: { onEdit: () => void }) {
  const { baby, hydrated } = useBaby();
  const { age, correctedAge, currentMonth, beyondRange, isFuture, ready } = useAge();
  const { lang, t } = useLanguage();

  if (!hydrated) return <div className="h-[6.5rem] rounded-xl border border-rule bg-surface" aria-hidden="true" />;

  if (!baby) {
    return (
      <button type="button" onClick={onEdit} className="flex w-full items-center gap-4 rounded-xl border border-rule bg-surface p-4 text-left hover:bg-hover/50">
        <LeafMark size={56} />
        <span className="min-w-0 flex-1">
          <span className="font-display block text-[1.1875rem] font-semibold leading-tight">{t("home.setup")}</span>
          <span className="mt-1 block text-[0.875rem] text-muted-foreground">{t("home.setup_hint")}</span>
        </span>
      </button>
    );
  }

  const name = displayName(baby, lang);
  const born = parseLocalDate(baby.birthDate);
  const label = (a: typeof age): string => {
    if (a.isFuture) return t("age.future");
    if (a.months === 0) return a.days === 0 ? t("age.today") : a.days === 1 ? t("age.day_only") : t("age.days_only", { days: a.days });
    if (a.months === 1) return a.days === 0 ? t("age.month_only") : t("age.month_days", { days: a.days });
    return a.days === 0 ? t("age.months_only", { months: a.months }) : t("age.months_days", { months: a.months, days: a.days });
  };
  const ageText = ready ? label(age) : "";
  const correctedText = ready && correctedAge ? t("age.corrected", { age: label(correctedAge) }) : "";

  return (
    <>
      <button
        type="button"
        onClick={onEdit}
        aria-label={t("home.edit_profile")}
        className="group flex w-full items-center gap-4 rounded-xl border border-rule bg-surface p-4 text-left transition-colors hover:bg-hover/50"
      >
        <LeafMark size={56} />
        <span className="min-w-0 flex-1">
          <span className="font-display block truncate text-[1.375rem] font-semibold leading-tight" lang={nameLang(name, lang)}>
            {name}
          </span>
          <span className="tnum mt-0.5 block text-[0.9375rem]">{ageText || " "}</span>
          {correctedText && <span className="tnum mt-0.5 block text-[0.8125rem] font-medium text-primary">{correctedText}</span>}
          {born && <span className="tnum mt-0.5 block text-[0.8125rem] text-muted-foreground">{t("age.born", { date: formatDate(lang, born) })}</span>}
        </span>
        <span className="flex flex-col items-end gap-2">
          <span className="tnum rounded-full bg-primary px-2.5 py-1 text-[0.75rem] font-semibold text-primary-foreground">{t("age.month_pill", { month: currentMonth })}</span>
          <Pencil className="size-4 text-muted-foreground" aria-hidden="true" />
        </span>
      </button>
      {ready && (beyondRange || isFuture) && (
        <p className="rounded-lg bg-hover px-3 py-2 text-[0.8125rem] text-muted-foreground">{beyondRange ? t("age.beyond") : t("age.future")}</p>
      )}
    </>
  );
}
