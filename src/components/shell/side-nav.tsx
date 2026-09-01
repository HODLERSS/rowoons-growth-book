"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAge } from "@/hooks/use-age";
import { useLanguage } from "@/hooks/use-language";
import { Wordmark } from "@/components/brand/wordmark";
import { NAV_ITEMS, navActive, navHref } from "./nav-items";

export function SideNav() {
  const pathname = usePathname();
  const { currentMonth } = useAge();
  const { t } = useLanguage();
  const settingsActive = pathname.startsWith("/settings");
  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-rule md:bg-surface">
      <div className="sticky top-0 flex h-dvh flex-col p-4">
        <Link href="/" className="flex h-11 items-center px-2 rounded-lg hover:bg-hover">
          <Wordmark className="text-[1.375rem]" />
        </Link>
        <nav aria-label={t("nav.home")} className="mt-4 flex-1">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = navActive(item, pathname);
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link
                    href={navHref(item, currentMonth)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] transition-colors",
                      active ? "bg-hover font-semibold text-primary" : "text-foreground hover:bg-hover"
                    )}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                    <span>{t(item.label)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <Link
          href="/settings"
          aria-current={settingsActive ? "page" : undefined}
          className={cn(
            "flex h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] transition-colors",
            settingsActive ? "bg-hover font-semibold text-primary" : "text-foreground hover:bg-hover"
          )}
        >
          <Settings className="size-5" strokeWidth={1.8} aria-hidden="true" />
          <span>{t("nav.settings")}</span>
        </Link>
      </div>
    </aside>
  );
}
