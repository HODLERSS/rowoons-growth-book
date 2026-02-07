"use client";

import { PlayTip } from "@/lib/types";
import { DIFFICULTY_CONFIG } from "@/lib/constants";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/shared/source-modal";

interface TipCardProps {
  tip: PlayTip;
}

export function TipCard({ tip }: TipCardProps) {
  const difficulty = DIFFICULTY_CONFIG[tip.difficulty];

  return (
    <Card className="gap-4 hover:shadow-md transition-shadow active:scale-[0.99]">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{tip.title}</CardTitle>
          <Badge className={difficulty.color}>{difficulty.label}</Badge>
        </div>
        <CardDescription className="capitalize">{tip.category}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {tip.description}
        </p>
        {tip.materials && tip.materials.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Materials needed:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tip.materials.map((material) => (
                <span
                  key={material}
                  className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full"
                >
                  {material}
                </span>
              ))}
            </div>
          </div>
        )}
        {tip.source && (
          <SourceBadge sourceInfo={tip} itemTitle={tip.title} />
        )}
      </CardContent>
    </Card>
  );
}
