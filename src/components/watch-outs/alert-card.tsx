"use client";

import { WatchOut } from "@/lib/types";
import { SEVERITY_CONFIG } from "@/lib/constants";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/shared/source-modal";

interface AlertCardProps {
  watchOut: WatchOut;
}

export function AlertCard({ watchOut }: AlertCardProps) {
  const severity = SEVERITY_CONFIG[watchOut.severity];

  const borderColor =
    watchOut.severity === "urgent"
      ? "border-l-red-400"
      : watchOut.severity === "caution"
        ? "border-l-yellow-400"
        : "border-l-blue-400";

  return (
    <Card className={`gap-4 border-l-4 ${borderColor}`}>
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{severity.icon}</span>
            <CardTitle className="text-base">{watchOut.title}</CardTitle>
          </div>
          <Badge className={severity.color}>{severity.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {watchOut.description}
        </p>
        {watchOut.action && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium mb-1">What to do:</p>
            <p className="text-sm text-muted-foreground">{watchOut.action}</p>
          </div>
        )}
        {watchOut.source && (
          <SourceBadge sourceInfo={watchOut} itemTitle={watchOut.title} />
        )}
      </CardContent>
    </Card>
  );
}
