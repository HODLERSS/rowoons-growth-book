"use client";

import { PlayTip } from "@/lib/types";
import { TipCard } from "./tip-card";

interface TipListProps {
  tips: PlayTip[];
}

export function TipList({ tips }: TipListProps) {
  if (tips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">🎨</span>
        <p className="text-muted-foreground text-sm">
          No play tips for this month yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tips.map((tip) => (
        <TipCard key={tip.id} tip={tip} />
      ))}
    </div>
  );
}
