"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Star, Sparkles, AlertTriangle, BookOpen } from "lucide-react";
import { useAge } from "@/hooks/use-age";
import { useLanguage } from "@/contexts/language-context";

const navItems = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/milestones", labelKey: "nav.milestones", icon: Star },
  { href: "/play-tips", labelKey: "nav.play", icon: Sparkles },
  { href: "/watch-outs", labelKey: "nav.watch", icon: AlertTriangle },
  { href: "/memo", labelKey: "nav.memo", icon: BookOpen },
];

export function MobileNav() {
  const pathname = usePathname();
  const { currentMonth } = useAge();
  const { t } = useLanguage();

  const getHref = (href: string) => {
    if (href === "/" || href === "/memo") return href;
    return `${href}/${currentMonth}`;
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={getHref(item.href)}
              className={cn(
                "flex flex-col items-center gap-0.5 min-w-[56px] px-2 py-1.5 rounded-xl transition-colors active:scale-95",
                active
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "fill-primary/20")} />
              <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
