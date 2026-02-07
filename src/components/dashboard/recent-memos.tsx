"use client";

import Link from "next/link";
import { useMemos } from "@/hooks/use-memos";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RecentMemos() {
  const { memos } = useMemos();

  const recentMemos = memos.slice(0, 3);

  if (recentMemos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Memos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm">No memos yet</p>
            <Link
              href="/memo/new"
              className="text-sm text-primary hover:underline mt-1 inline-block"
            >
              Write your first memo
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Memos</span>
          <Link
            href="/memo"
            className="text-sm font-normal text-primary hover:underline"
          >
            View all
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentMemos.map((memo) => (
          <Link
            key={memo.id}
            href={`/memo/${memo.id}`}
            className="block rounded-lg p-3 bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm truncate flex-1">
                {memo.title}
              </h4>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(memo.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {memo.content}
            </p>
            {memo.tags && memo.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {memo.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
