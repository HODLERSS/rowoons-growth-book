"use client";

import { KEYS, readKey, writeKey, jsonOr } from "./store";
import type { BabyInfo, BackupFile, Memo, MilestoneCompletion } from "./types";
import { isLanguage } from "@/i18n";

export function isBabyInfo(v: unknown): v is BabyInfo {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.name === "string" && typeof o.birthDate === "string";
}

export function isMemoArray(v: unknown): v is Memo[] {
  return Array.isArray(v) && v.every((m) => m && typeof m === "object" && typeof (m as Memo).id === "string");
}

export function isCompletion(v: unknown): v is MilestoneCompletion {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function isBackupFile(v: unknown): v is BackupFile {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return o.app === "dodam" && o.version === 1 && (o.profile === null || isBabyInfo(o.profile)) && isMemoArray(o.memos) && isCompletion(o.milestones);
}

export function createBackup(): BackupFile {
  return {
    app: "dodam",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: readKey(KEYS.profile, jsonOr<BabyInfo | null>(null, (v): v is BabyInfo | null => v === null || isBabyInfo(v))),
    language: readKey(KEYS.language, jsonOr<"en" | "ko" | null>(null, (v): v is "en" | "ko" | null => v === null || isLanguage(v))),
    milestones: readKey(KEYS.milestones, jsonOr<MilestoneCompletion>({}, isCompletion)),
    memos: readKey(KEYS.memos, jsonOr<Memo[]>([], isMemoArray)),
  };
}

export function restoreBackup(file: BackupFile): void {
  writeKey(KEYS.profile, file.profile);
  if (file.language) writeKey(KEYS.language, file.language);
  writeKey(KEYS.milestones, file.milestones);
  writeKey(KEYS.memos, file.memos);
}

export function clearAllData(): void {
  writeKey(KEYS.profile, null);
  writeKey(KEYS.milestones, null);
  writeKey(KEYS.memos, null);
  writeKey(KEYS.settings, null);
}

export function backupFilename(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `dodam-backup-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}.json`;
}
