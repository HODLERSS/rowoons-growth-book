import type { Page, BrowserContext } from "@playwright/test";

export const PROFILE = { name: "Rowoon", nameKo: "로운", birthDate: "2025-04-17" };
export const TODAY = "2026-08-31";
/** Month for PROFILE on TODAY (16 months 14 days). */
export const CURRENT_MONTH = 16;

export const ROUTES = ["/", `/milestones/${CURRENT_MONTH}/`, `/play-tips/${CURRENT_MONTH}/`, `/watch-outs/${CURRENT_MONTH}/`, "/memo/", "/memo/new/", "/settings/", "/privacy/", "/terms/", "/support/"];

/** Seed a profile (and optionally language) before any page script runs, and pin the clock. */
export async function seed(ctx: BrowserContext, opts: { lang?: "en" | "ko"; profile?: typeof PROFILE | null; milestones?: Record<string, unknown>; memos?: unknown[] } = {}) {
  const { lang = "en", profile = PROFILE, milestones = {}, memos = [] } = opts;
  await ctx.addInitScript(
    ([p, l, ms, mm]) => {
      if (localStorage.getItem("e2e:seeded")) return; // seed once per context, not on every navigation
      localStorage.setItem("e2e:seeded", "1");
      if (p) localStorage.setItem("sprout:profile", JSON.stringify(p));
      localStorage.setItem("sprout:language", JSON.stringify(l));
      localStorage.setItem("sprout:milestones", JSON.stringify(ms));
      localStorage.setItem("sprout:memos", JSON.stringify(mm));
    },
    [profile, lang, milestones, memos] as const
  );
}

/** Navigate and wait until React has hydrated (clicks before that are lost, as on any SSR app). */
export async function gotoReady(page: Page, url: string) {
  const res = await page.goto(url);
  await page.waitForSelector("html[data-hydrated]", { state: "attached" });
  return res;
}

/** Switch the stored language on an already-open page and reload. */
export async function setLanguage(page: Page, lang: "en" | "ko") {
  await page.evaluate((l) => localStorage.setItem("sprout:language", JSON.stringify(l)), lang);
  await page.reload();
  await page.waitForSelector("html[data-hydrated]", { state: "attached" });
}

export async function pinClock(page: Page, iso = `${TODAY}T10:00:00`) {
  await page.clock.setFixedTime(new Date(iso));
}

/** Collect console errors/warnings and page errors for the life of the page. */
export function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") problems.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`[pageerror] ${err.message}`));
  return problems;
}

/**
 * Pretend to be the iOS app: a fake WKWebView bridge that Capacitor core picks up, with LocalNotifications backed by
 * localStorage (`e2e:perm`, `e2e:pending`). `answer` is what the user taps at the one-time iOS permission prompt.
 */
export async function fakeNative(ctx: BrowserContext, opts: { answer: "granted" | "denied"; perm?: "prompt" | "granted" | "denied" }) {
  await ctx.addInitScript(
    ([answer, initial]) => {
      if (!localStorage.getItem("e2e:perm")) localStorage.setItem("e2e:perm", initial);
      const promise = (...names: string[]) => names.map((name) => ({ name, rtype: "promise" }));
      const listen = [{ name: "addListener", rtype: "callback" }, ...promise("removeListener", "removeAllListeners")];
      const pending = () => JSON.parse(localStorage.getItem("e2e:pending") ?? "[]") as { id: number }[];
      let callbackId = 0;
      const w = window as unknown as Record<string, unknown>;
      w.webkit = { messageHandlers: { bridge: { postMessage() {} } } };
      w.Capacitor = {
        isNativePlatform: () => true,
        PluginHeaders: [
          { name: "LocalNotifications", methods: [...promise("checkPermissions", "requestPermissions", "schedule", "getPending", "cancel"), ...listen] },
          { name: "App", methods: listen },
          { name: "Haptics", methods: promise("impact", "notification", "vibrate", "selectionStart", "selectionChanged", "selectionEnd") },
        ],
        nativeCallback: () => String(++callbackId),
        nativePromise: async (plugin: string, method: string, options: { notifications?: { id: number }[] }) => {
          if (plugin !== "LocalNotifications") return {};
          if (method === "checkPermissions") return { display: localStorage.getItem("e2e:perm") };
          if (method === "requestPermissions") {
            if (localStorage.getItem("e2e:perm") === "prompt") localStorage.setItem("e2e:perm", answer);
            return { display: localStorage.getItem("e2e:perm") };
          }
          if (method === "getPending") return { notifications: pending() };
          if (method === "schedule") localStorage.setItem("e2e:pending", JSON.stringify([...pending(), ...(options.notifications ?? [])]));
          if (method === "cancel") {
            const gone = new Set((options.notifications ?? []).map((n) => n.id));
            localStorage.setItem("e2e:pending", JSON.stringify(pending().filter((n) => !gone.has(n.id))));
          }
          return {};
        },
      };
    },
    [opts.answer, opts.perm ?? "prompt"] as const
  );
}
