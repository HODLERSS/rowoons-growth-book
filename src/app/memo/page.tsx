"use client";

import Link from "next/link";
import { Header } from "@/components/shared/header";
import { Button } from "@/components/ui/button";
import { MemoCard } from "@/components/memo/memo-card";
import { useMemos } from "@/hooks/use-memos";
import { useLanguage } from "@/contexts/language-context";
import { Plus } from "lucide-react";

export default function MemoListPage() {
  const { memos } = useMemos();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-full">
      <Header
        title={t("memo.title")}
        subtitle={
          memos.length === 1
            ? t("memo.count_one").replace("{count}", String(memos.length))
            : t("memo.count").replace("{count}", String(memos.length))
        }
        actions={
          <Button asChild size="sm">
            <Link href="/memo/new">
              <Plus className="size-4" />
              {t("memo.new")}
            </Link>
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-3 pb-8">
          {memos.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-4xl">📝</p>
              <p className="text-muted-foreground text-sm">
                {t("memo.empty")}. {t("memo.write")}!
              </p>
              <Button asChild size="sm" className="mt-2">
                <Link href="/memo/new">
                  <Plus className="size-4" />
                  {t("memo.new")}
                </Link>
              </Button>
            </div>
          ) : (
            memos.map((memo) => <MemoCard key={memo.id} memo={memo} />)
          )}
        </div>
      </div>
    </div>
  );
}
