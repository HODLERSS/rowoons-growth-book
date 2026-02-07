"use client";

import Link from "next/link";
import { Header } from "@/components/shared/header";
import { Button } from "@/components/ui/button";
import { MemoCard } from "@/components/memo/memo-card";
import { useMemos } from "@/hooks/use-memos";
import { Plus } from "lucide-react";

export default function MemoListPage() {
  const { memos } = useMemos();

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Memo Journal"
        subtitle={`${memos.length} memo${memos.length !== 1 ? "s" : ""}`}
        actions={
          <Button asChild size="sm">
            <Link href="/memo/new">
              <Plus className="size-4" />
              New Memo
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
                No memos yet. Start your first memo!
              </p>
              <Button asChild size="sm" className="mt-2">
                <Link href="/memo/new">
                  <Plus className="size-4" />
                  Write a Memo
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
