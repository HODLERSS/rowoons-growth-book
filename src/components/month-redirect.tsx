"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/shell/header";
import { useAge } from "@/hooks/use-age";
import { useLanguage } from "@/hooks/use-language";
import type { MessageKey } from "@/i18n";

/** /milestones → /milestones/{current month}. Renders the header while redirecting. */
export function MonthRedirect({ base, titleKey }: { base: string; titleKey: MessageKey }) {
  const router = useRouter();
  const { currentMonth, ready } = useAge();
  const { t } = useLanguage();
  useEffect(() => {
    if (ready) router.replace(`${base}/${currentMonth}`);
  }, [ready, currentMonth, base, router]);
  return <Header title={t(titleKey)} />;
}
