import type { Memo, MilestoneCompletion } from "./types";

/**
 * How each stored key reconciles when a signed-in device meets the account copy. Sets union, records keep the
 * newer edit, the account copy wins for the profile and settings, and language stays a device preference.
 * Pure and total: garbage on either side degrades to the empty value for that key.
 */
export const SYNC_KEYS = ["profile", "milestones", "memos", "settings", "acks", "language"] as const;
export type SyncKey = (typeof SYNC_KEYS)[number];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function mergeKey(key: SyncKey, local: unknown, remote: unknown): unknown {
  switch (key) {
    case "milestones": {
      const out: MilestoneCompletion = {};
      for (const side of [remote, local]) {
        if (!isObj(side)) continue;
        for (const [id, v] of Object.entries(side)) {
          if (!isObj(v) || v.completed !== true) continue;
          const at = typeof v.completedAt === "string" ? v.completedAt : undefined;
          const cur = out[id];
          if (!cur || (at && (!cur.completedAt || at < cur.completedAt))) out[id] = { completed: true, completedAt: at ?? cur?.completedAt };
        }
      }
      return out;
    }
    case "memos": {
      const byId = new Map<string, Memo>();
      for (const side of [remote, local]) {
        if (!Array.isArray(side)) continue;
        for (const m of side as Memo[]) {
          if (!isObj(m) || typeof m.id !== "string") continue;
          const cur = byId.get(m.id);
          if (!cur || Date.parse(m.updatedAt ?? "") >= Date.parse(cur.updatedAt ?? "")) byId.set(m.id, m);
        }
      }
      return Array.from(byId.values()).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    }
    case "acks": {
      const out: string[] = [];
      for (const side of [local, remote]) if (Array.isArray(side)) for (const id of side) if (typeof id === "string" && !out.includes(id)) out.push(id);
      return out;
    }
    case "profile":
    case "settings":
      return isObj(remote) ? remote : isObj(local) ? local : null;
    case "language":
      return local === "en" || local === "ko" ? local : remote === "en" || remote === "ko" ? remote : null;
  }
}
