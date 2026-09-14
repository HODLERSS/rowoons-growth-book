"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAge } from "@/hooks/use-age";
import { useLanguage } from "@/hooks/use-language";
import { NAV_ITEMS, navActive, navHref } from "./nav-items";

export function TabBar() {
  const pathname = usePathname();
  const { currentMonth } = useAge();
  const { t } = useLanguage();
  return (
    <nav aria-label={t("nav.home")} className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface pb-safe md:hidden">
      <ul className="flex h-16 items-stretch justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const active = navActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={navHref(item, currentMonth)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg font-medium transition-colors [font-size:min(0.75rem,15px)]",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground active:text-foreground"
                )}
              >
                <Icon className="size-[1.375rem]" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                <span className="max-w-full truncate px-0.5">{t(item.label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
