"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Renders a back link to this href. */
  backHref?: string;
  actions?: React.ReactNode;
  /** Leading slot, used for the wordmark on Home. */
  leading?: React.ReactNode;
  className?: string;
}

export function Header({ title, subtitle, backHref, actions, leading, className }: HeaderProps) {
  const { t } = useLanguage();
  return (
    <header className={cn("sticky top-0 z-30 border-b border-rule bg-page pt-safe", className)}>
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2.5 md:py-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label={t("nav.back")}
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-hover"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        )}
        {leading}
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-[1.375rem] font-semibold leading-tight md:text-2xl">{title}</h1>
          {subtitle && <p className="tnum truncate text-[0.8125rem] text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </header>
  );
}

export function Screen({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-2xl px-4 py-4", className)}>{children}</div>;
}
