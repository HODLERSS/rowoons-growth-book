import type { Settings } from "./types";

/** Same values as `ReminderStatus` in ./reminders (kept here so this file stays free of Capacitor imports). */
export type AskStatus = "unsupported" | "prompt" | "granted" | "denied";

/**
 * The native Home card that offers reminders before iOS asks. Shown once a baby exists, reminders are off, the
 * card was never answered, and iOS can still say yes (never after the OS already refused: it would only nag).
 * `nextMonth` is null past the last month in the book, when there is nothing left to remind about.
 */
export function shouldAskReminders(o: { native: boolean; hasBaby: boolean; nextMonth: number | null; settings: Settings; status: AskStatus | null }): boolean {
  if (!o.native || !o.hasBaby || o.nextMonth === null) return false;
  if (o.settings.reminders || o.settings.remindersAsked) return false;
  return o.status === "prompt" || o.status === "granted";
}

export type AskOutcome = "on" | "denied" | "off";

/**
 * "Turn on reminders": schedule through the same path Settings uses (it requests permission first), then read
 * the status back. Every outcome records the answer so the card never comes back; only "on" turns reminders on.
 */
export async function acceptReminders(deps: { schedule: () => Promise<number>; status: () => Promise<AskStatus> }): Promise<{ outcome: AskOutcome; patch: Partial<Settings> }> {
  const scheduled = await deps.schedule();
  if (scheduled > 0) return { outcome: "on", patch: { reminders: true, remindersAsked: true } };
  const outcome: AskOutcome = (await deps.status()) === "denied" ? "denied" : "off";
  return { outcome, patch: { reminders: false, remindersAsked: true } };
}

/** "Not now" and turning reminders off in Settings both count as an answer. */
export const DISMISS_PATCH: Partial<Settings> = { remindersAsked: true };
