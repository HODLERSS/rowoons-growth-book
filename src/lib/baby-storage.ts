import { BabyInfo } from "./types";

const STORAGE_KEY = "baby-profile";

export function getBabyProfile(): BabyInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveBabyProfile(info: BabyInfo): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}

export function hasBabyProfile(): boolean {
  return getBabyProfile() !== null;
}
