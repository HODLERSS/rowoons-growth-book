"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="flex items-center gap-3 px-4 py-2.5 md:py-3 border-b bg-card/50">
      <SidebarTrigger className="hidden" />
      <Separator orientation="vertical" className="h-6 hidden" />
      <div className="flex-1 min-w-0">
        <h1 className="text-base md:text-lg font-semibold truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
