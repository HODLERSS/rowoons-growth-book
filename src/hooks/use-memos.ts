"use client";

import { useState, useCallback, useEffect } from "react";
import { Memo } from "@/lib/types";
import {
  getAllMemos,
  getMemo,
  createMemo,
  updateMemo,
  deleteMemo,
} from "@/lib/memo-storage";

export function useMemos() {
  const [memos, setMemos] = useState<Memo[]>([]);

  const refresh = useCallback(() => {
    setMemos(getAllMemos());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const get = useCallback((id: string) => getMemo(id), []);

  const create = useCallback(
    (memo: Omit<Memo, "id" | "createdAt" | "updatedAt">) => {
      const newMemo = createMemo(memo);
      refresh();
      return newMemo;
    },
    [refresh]
  );

  const update = useCallback(
    (id: string, updates: Partial<Omit<Memo, "id" | "createdAt">>) => {
      const updated = updateMemo(id, updates);
      refresh();
      return updated;
    },
    [refresh]
  );

  const remove = useCallback(
    (id: string) => {
      const result = deleteMemo(id);
      refresh();
      return result;
    },
    [refresh]
  );

  return { memos, get, create, update, remove, refresh };
}
