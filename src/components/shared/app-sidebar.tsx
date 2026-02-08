"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BABY } from "@/lib/constants";
import { useAge } from "@/hooks/use-age";
import { useLanguage } from "@/contexts/language-context";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Home, Star, Sparkles, AlertTriangle, BookOpen } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { age, currentMonth, mounted } = useAge();
  const { t } = useLanguage();

  const navItems = [
    { href: "/", label: t("sidebar.dashboard"), icon: Home },
    { href: "/milestones", label: t("sidebar.milestones"), icon: Star },
    { href: "/play-tips", label: t("sidebar.playtips"), icon: Sparkles },
    { href: "/watch-outs", label: t("sidebar.watchouts"), icon: AlertTriangle },
    { href: "/memo", label: t("sidebar.memo"), icon: BookOpen },
  ];

  const getHref = (href: string) => {
    if (href === "/" || href === "/memo") return href;
    return `${href}/${currentMonth}`;
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 bg-primary/10">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {BABY.name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-base">{BABY.name}{t("app.growth_book")}</h2>
            {mounted && <p className="text-xs text-muted-foreground">{age.label} {t("age.old")}</p>}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={cn(
                        "transition-colors",
                        active && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <Link href={getHref(item.href)}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
