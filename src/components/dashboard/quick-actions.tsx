"use client";

import Link from "next/link";
import { useAge } from "@/hooks/use-age";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Sparkles, AlertTriangle, BookOpen } from "lucide-react";

export function QuickActions() {
  const { currentMonth } = useAge();
  const { t } = useLanguage();

  const actions = [
    {
      icon: Star,
      title: t("quick.milestones"),
      description: t("quick.milestones_desc"),
      href: (month: number) => `/milestones/${month}`,
      color: "text-yellow-600 bg-yellow-50",
    },
    {
      icon: Sparkles,
      title: t("quick.playtips"),
      description: t("quick.playtips_desc"),
      href: (month: number) => `/play-tips/${month}`,
      color: "text-purple-600 bg-purple-50",
    },
    {
      icon: AlertTriangle,
      title: t("quick.watchouts"),
      description: t("quick.watchouts_desc"),
      href: (month: number) => `/watch-outs/${month}`,
      color: "text-orange-600 bg-orange-50",
    },
    {
      icon: BookOpen,
      title: t("quick.newmemo"),
      description: t("quick.newmemo_desc"),
      href: () => "/memo/new",
      color: "text-primary bg-warm-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link key={action.title} href={action.href(currentMonth)}>
            <Card className="py-4 hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30">
              <CardContent className="flex flex-col items-center text-center gap-2 px-3">
                <div
                  className={`rounded-full p-2.5 ${action.color}`}
                >
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">{action.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
