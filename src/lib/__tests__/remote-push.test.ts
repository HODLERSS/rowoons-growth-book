import { beforeEach, describe, expect, it, vi } from "vitest";

// Native glue for Notes from Sprout, with the Capacitor bridge, the push plugin and Supabase faked.
const h = vi.hoisted(() => ({
  status: "notDetermined" as string,
  env: "sandbox",
  calls: [] as string[],
  rpc: [] as { fn: string; args: Record<string, unknown> }[],
  listeners: {} as Record<string, (e: unknown) => void>,
}));

vi.mock("@capacitor/core", () => ({
  registerPlugin: () => ({
    status: async () => ({ status: h.status }),
    requestQuiet: async () => {
      h.calls.push("requestQuiet");
      if (h.status === "notDetermined") h.status = "provisional";
      return { status: h.status };
    },
    apnsEnvironment: async () => ({ environment: h.env }),
  }),
}));
vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    addListener: async (name: string, cb: (e: unknown) => void) => {
      h.listeners[name] = cb;
      return { remove: async () => void delete h.listeners[name] };
    },
    register: async () => void h.calls.push("register"),
    unregister: async () => void h.calls.push("unregister"),
  },
}));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: { checkPermissions: async () => ({ display: "granted" }) } }));
vi.mock("../supabase", () => ({
  supabase: () => ({ rpc: async (fn: string, args: Record<string, unknown>) => (h.rpc.push({ fn, args }), { error: null }) }),
}));

const store = new Map<string, string>();
Object.assign(globalThis, {
  window: { Capacitor: { isNativePlatform: () => true } },
  localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
});

const load = async () => {
  vi.resetModules();
  return import("../remote-push");
};

beforeEach(() => {
  h.status = "notDetermined";
  h.calls = [];
  h.rpc = [];
  h.listeners = {};
  store.clear();
});

describe("syncRemotePush", () => {
  it("first launch: quiet authorization (no prompt), registers, and saves only token, environment, language and time zone", async () => {
    store.set("sprout:language", JSON.stringify("ko"));
    const m = await load();
    expect(await m.syncRemotePush()).toBe("provisional");
    expect(h.calls).toEqual(["requestQuiet", "register"]);
    h.listeners.registration({ value: "ab".repeat(32) });
    await new Promise((r) => setTimeout(r, 0));
    expect(h.rpc).toEqual([{ fn: "register_push_device", args: { p_token: "ab".repeat(32), p_environment: "sandbox", p_lang: "ko", p_tz: expect.any(String) } }]);
    expect(store.get("sprout-push-token")).toBe("ab".repeat(32));
  });
  it("already decided: never asks again", async () => {
    h.status = "authorized";
    const m = await load();
    await m.syncRemotePush();
    expect(h.calls).toEqual(["register"]);
  });
  it("denied: removes this device's token and does not register", async () => {
    h.status = "denied";
    store.set("sprout-push-token", "cd".repeat(32));
    const m = await load();
    expect(await m.syncRemotePush()).toBe("denied");
    expect(h.calls).toEqual([]);
    expect(h.rpc).toEqual([{ fn: "unregister_push_device", args: { p_token: "cd".repeat(32) } }]);
  });
  it("switched off in Settings: no request, no registration", async () => {
    store.set("sprout-push", "off");
    const m = await load();
    await m.syncRemotePush();
    expect(h.calls).toEqual([]);
    expect(h.rpc).toEqual([]);
  });
});

describe("setNotesEnabled", () => {
  it("off deletes the token server side and unregisters; on registers again", async () => {
    h.status = "provisional";
    store.set("sprout-push-token", "ef".repeat(32));
    const m = await load();
    await m.setNotesEnabled(false);
    expect(store.get("sprout-push")).toBe("off");
    expect(h.rpc).toEqual([{ fn: "unregister_push_device", args: { p_token: "ef".repeat(32) } }]);
    expect(h.calls).toEqual(["unregister"]);
    expect(m.notesEnabled()).toBe(false);
    await m.setNotesEnabled(true);
    expect(h.calls).toEqual(["unregister", "register"]);
  });
});

describe("taps", () => {
  it("open the app route a note names, anything else lands on Home", async () => {
    const m = await load();
    const opened: string[] = [];
    m.onRemotePushOpen((u) => opened.push(u));
    await new Promise((r) => setTimeout(r, 0));
    h.listeners.pushNotificationActionPerformed({ notification: { data: { url: "/play-tips/17/" } } });
    h.listeners.pushNotificationActionPerformed({ notification: { data: { url: "https://evil.example" } } });
    expect(opened).toEqual(["/play-tips/17/", "/"]);
  });
});

describe("reminderStatus", () => {
  it("quiet delivery is not a yes to reminders (asking still shows the one prompt)", async () => {
    vi.resetModules();
    const { reminderStatus } = await import("../reminders");
    h.status = "provisional";
    expect(await reminderStatus()).toBe("prompt");
    h.status = "authorized";
    expect(await reminderStatus()).toBe("granted");
    h.status = "denied";
    expect(await reminderStatus()).toBe("denied");
    h.status = "notDetermined";
    expect(await reminderStatus()).toBe("prompt");
  });
});
