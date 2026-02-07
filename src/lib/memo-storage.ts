import { Memo } from "./types";

const STORAGE_KEY = "rowoon-memos";

function getStorageData(): Memo[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setStorageData(memos: Memo[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

export function getAllMemos(): Memo[] {
  return getStorageData().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getMemo(id: string): Memo | undefined {
  return getStorageData().find((m) => m.id === id);
}

export function createMemo(
  memo: Omit<Memo, "id" | "createdAt" | "updatedAt">
): Memo {
  const now = new Date().toISOString();
  const newMemo: Memo = {
    ...memo,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const memos = getStorageData();
  memos.push(newMemo);
  setStorageData(memos);
  return newMemo;
}

export function updateMemo(
  id: string,
  updates: Partial<Omit<Memo, "id" | "createdAt">>
): Memo | undefined {
  const memos = getStorageData();
  const index = memos.findIndex((m) => m.id === id);
  if (index === -1) return undefined;
  memos[index] = {
    ...memos[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  setStorageData(memos);
  return memos[index];
}

export function deleteMemo(id: string): boolean {
  const memos = getStorageData();
  const filtered = memos.filter((m) => m.id !== id);
  if (filtered.length === memos.length) return false;
  setStorageData(filtered);
  return true;
}
