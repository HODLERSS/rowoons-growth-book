"use client";

import { useAge } from "@/hooks/use-age";
import { BABY } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function AgeDisplay() {
  const { age, currentMonth, mounted } = useAge();

  return (
    <Card className="bg-gradient-to-br from-warm-50 to-warm-100 border-warm-200">
      <CardContent className="flex items-center gap-4">
        <Avatar size="lg" className="size-16 bg-primary/10">
          <AvatarFallback className="bg-primary/10 text-2xl">
            {BABY.gender === "girl" ? "\uD83D\uDC76" : "\uD83D\uDC76"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground">
            {BABY.name}
          </h2>
          {mounted && (
            <p className="text-base text-muted-foreground">
              {age.label} old
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary" className="bg-warm-100 text-warm-700">
              Born {(() => {
                const [y, m, d] = BABY.birthDate.split("-").map(Number);
                return new Date(y, m - 1, d).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                });
              })()}
            </Badge>
            <Badge className="bg-primary text-primary-foreground">
              Month {currentMonth}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
