"use client";

import Link from "next/link";
import { Header, Screen } from "@/components/shell/header";
import { EmptyState } from "@/components/empty-state";
import { useLanguage } from "@/hooks/use-language";

export function NotFoundScreen() {
  const { t } = useLanguage();
  return (
    <>
      <Header title={t("notfound.title")} />
      <Screen>
        <EmptyState
          text={t("notfound.body")}
          action={
            <Link href="/" className="flex h-11 items-center rounded-lg border border-rule px-4 text-[0.9375rem] font-semibold hover:bg-hover">
              {t("notfound.home")}
            </Link>
          }
        />
      </Screen>
    </>
  );
}
