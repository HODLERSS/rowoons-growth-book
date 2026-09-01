"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Header, Screen } from "@/components/shell/header";
import { EmptyState } from "@/components/empty-state";
import { MemoCard } from "@/components/journal/memo-card";
import { useMemos } from "@/hooks/use-memos";
import { useLanguage } from "@/hooks/use-language";
import { useHydrated } from "@/lib/store";

export function JournalScreen() {
  const { memos } = useMemos();
  const { t } = useLanguage();
  const hydrated = useHydrated();
  const newLink = (
    <Link href="/memo/new" className="flex h-11 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[14px] font-semibold text-primary-foreground hover:opacity-90">
      <Plus className="size-4" aria-hidden="true" />
      {t("journal.new")}
    </Link>
  );
  return (
    <>
      <Header title={t("journal.title")} subtitle={hydrated ? t(memos.length === 1 ? "journal.count_one" : "journal.count", { count: memos.length }) : undefined} actions={newLink} />
      <Screen>
        {hydrated && memos.length === 0 ? (
          <EmptyState
            text={t("journal.empty")}
            action={
              <Link href="/memo/new" className="flex h-11 items-center rounded-lg border border-rule px-4 text-[15px] font-semibold hover:bg-hover">
                {t("journal.write_first")}
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {memos.map((m) => (
              <MemoCard key={m.id} memo={m} />
            ))}
          </ul>
        )}
      </Screen>
    </>
  );
}
