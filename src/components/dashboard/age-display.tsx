"use client";

import { useAge } from "@/hooks/use-age";
import { useLanguage } from "@/contexts/language-context";
import { useBaby } from "@/contexts/baby-context";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function AgeDisplay() {
  const { baby } = useBaby();
  const { age, currentMonth, mounted } = useAge();
  const { lang, t } = useLanguage();

  if (!baby) {
    return (
      <Card className="bg-gradient-to-br from-warm-50 to-warm-100 border-warm-200">
        <CardContent className="flex items-center gap-4 py-6">
          <Avatar size="lg" className="size-16 bg-muted">
            <AvatarFallback className="bg-muted text-2xl">👶</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground">
              {lang === "ko" ? "아기 정보를 설정해 주세요" : "Set up your baby's profile"}
            </h2>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-warm-50 to-warm-100 border-warm-200">
      <CardContent className="flex items-center gap-4">
        <Avatar size="lg" className="size-16 bg-primary/10">
          <AvatarFallback className="bg-primary/10 text-2xl">
            {baby.gender === "girl" ? "👶" : "👶"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground">
            {lang === "ko" ? (baby.nameKo || baby.name) : baby.name}
          </h2>
          {mounted && (
            <p className="text-base text-muted-foreground">
              {(() => {
                if (lang === "ko") {
                  const parts = [];
                  if (age.months > 0) parts.push(`${age.months}개월`);
                  if (age.days > 0) parts.push(`${age.days}일`);
                  return parts.join(" ");
                }
                return `${age.label} ${t("age.old")}`;
              })()}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary" className="bg-warm-100 text-warm-700">
              {t("age.born")} {(() => {
                const [y, m, d] = baby.birthDate.split("-").map(Number);
                return new Date(y, m - 1, d).toLocaleDateString(
                  lang === "ko" ? "ko-KR" : "en-US",
                  {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }
                );
              })()}
            </Badge>
            <Badge className="bg-primary text-primary-foreground">
              {lang === "ko" ? `${currentMonth}${t("age.month")}` : `${t("age.month")} ${currentMonth}`}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
