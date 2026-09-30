// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminScreen, type AdminCall } from "../AdminScreen";

const recipients = [
  { key: "user:33333333-3333-4333-8333-333333333333", kind: "account", email: "parent@example.com", web: 1, ios: 1, environments: ["production"], lang: "ko", since: "2026-09-01T00:00:00Z", last_seen: "2026-09-29T00:00:00Z" },
  { key: "web:2", kind: "guest", email: null, web: 1, ios: 0, environments: [], lang: "en", since: "2026-09-01T00:00:00Z", last_seen: "2026-09-20T00:00:00Z" },
];
const overview = { ok: true, accounts: 5, accountsNew7d: 1, guestsWithPush: 1, accountsWithPush: 1, webSubscriptions: 2, iosDevices: 1, iosSandbox: 0, reachable: 2, apnsConfigured: true };

function fakeCall(overrides: Record<string, (b: Record<string, unknown>) => { status: number; body: Record<string, unknown> }> = {}) {
  const calls: Record<string, unknown>[] = [];
  const call: AdminCall = async (b) => {
    calls.push(b);
    const a = String(b.action);
    if (overrides[a]) return overrides[a](b);
    if (a === "whoami") return { status: 200, body: { ok: true, admin: true, email: "minjae.m.lee@gmail.com" } };
    if (a === "overview") return { status: 200, body: overview };
    if (a === "recipients") return { status: 200, body: { ok: true, recipients } };
    if (a === "history") return { status: 200, body: { ok: true, history: [] } };
    if (a === "recipient") return { status: 200, body: { ok: true, endpoints: [{ channel: "ios", id: 1, environment: "production", seen: "2026-09-29T00:00:00Z", name: "로운", ageMonths: 17, ageDays: 13, corrected: false, lang: "ko" }] } };
    if (a === "test") return { status: 200, body: b.dry_run ? { ok: true, dry_run: true, devices: 1 } : { ok: true, sent: 1, devices: 1 } };
    if (a === "send") return { status: 200, body: { ok: true, sent: 2, devices: 2 } };
    if (a === "broadcast") return { status: 200, body: b.dry_run ? { ok: true, recipients: 2, devices: 3 } : { ok: true, recipients: 2, sent: 3, failed: 0 } };
    return { status: 400, body: { ok: false, error: "unknown" } };
  };
  return { call, calls };
}

describe("AdminScreen", () => {
  it("refuses an account the server does not call an admin", async () => {
    const { call } = fakeCall({ whoami: () => ({ status: 403, body: { ok: false, error: "This account is not a Sprout admin." } }) });
    render(<AdminScreen call={call} onSignOut={() => {}} />);
    expect(await screen.findByTestId("admin-denied")).toHaveTextContent("not a Sprout admin");
    expect(screen.queryByTestId("admin-ready")).toBeNull();
  });

  it("overview shows counts; lists carry no baby details until a row is opened", async () => {
    const { call } = fakeCall();
    render(<AdminScreen call={call} onSignOut={() => {}} />);
    expect(await screen.findByTestId("stat-accounts")).toHaveTextContent("5");
    expect(screen.getByTestId("stat-accounts")).toHaveTextContent("1 new in 7 days");
    expect(screen.getByTestId("admin-recipients")).not.toHaveTextContent("로운");
    await userEvent.click(screen.getByTestId("detail-user:33333333-3333-4333-8333-333333333333"));
    expect(await screen.findByTestId("admin-detail")).toHaveTextContent("baby 로운, 17 mo 13 d");
  });

  it("sending to others unlocks only after a test of the same words, and edits relock it", async () => {
    const { call, calls } = fakeCall();
    render(<AdminScreen call={call} onSignOut={() => {}} />);
    await userEvent.click(await screen.findByTestId("tab-send"));
    await userEvent.type(screen.getByTestId("admin-title"), "Hello");
    await userEvent.type(screen.getByTestId("admin-body"), "A note");
    expect(screen.getByTestId("admin-title-count")).toHaveTextContent("5/60");
    expect(screen.getByTestId("admin-preview")).toHaveTextContent("Hello");
    expect(screen.getByTestId("admin-broadcast")).toBeDisabled();
    await userEvent.selectOptions(screen.getByTestId("admin-recipient"), "web:2");
    expect(screen.getByTestId("admin-send-one")).toBeDisabled();
    await userEvent.click(screen.getByTestId("admin-send-test"));
    await waitFor(() => expect(screen.getByTestId("admin-send-one")).toBeEnabled());
    const test = calls.find((c) => c.action === "test")!;
    expect(test).toMatchObject({ title: "Hello", body: "A note", link: "/" });
    expect(String(test.idempotency_key)).toMatch(/^[A-Za-z0-9]{8,}$/);
    await userEvent.type(screen.getByTestId("admin-body"), "!");
    expect(screen.getByTestId("admin-send-one")).toBeDisabled();
  });

  it("dry run carries no idempotency key and says nothing was sent", async () => {
    const { call, calls } = fakeCall();
    render(<AdminScreen call={call} onSignOut={() => {}} />);
    await userEvent.click(await screen.findByTestId("tab-send"));
    await userEvent.type(screen.getByTestId("admin-title"), "Hi");
    await userEvent.type(screen.getByTestId("admin-body"), "There");
    await userEvent.selectOptions(screen.getByTestId("admin-link"), "/watch-outs/N/");
    await userEvent.clear(screen.getByTestId("admin-link-month"));
    await userEvent.type(screen.getByTestId("admin-link-month"), "17");
    expect(screen.getByTestId("admin-link-value")).toHaveTextContent("/watch-outs/17/");
    await userEvent.click(screen.getByTestId("admin-dry-run"));
    expect(await screen.findByTestId("admin-result")).toHaveTextContent("Nothing sent");
    const dry = calls.find((c) => c.dry_run)!;
    expect(dry).toMatchObject({ action: "test", link: "/watch-outs/17/" });
    expect(dry.idempotency_key).toBeUndefined();
  });

  it("broadcast needs the recipient count typed", async () => {
    const { call, calls } = fakeCall();
    render(<AdminScreen call={call} onSignOut={() => {}} />);
    await userEvent.click(await screen.findByTestId("tab-send"));
    await userEvent.type(screen.getByTestId("admin-title"), "Hi");
    await userEvent.type(screen.getByTestId("admin-body"), "All");
    await userEvent.click(screen.getByTestId("admin-send-test"));
    await waitFor(() => expect(screen.getByTestId("admin-broadcast")).toBeEnabled());
    await userEvent.click(screen.getByTestId("admin-broadcast"));
    expect(screen.getByTestId("admin-confirm-broadcast")).toBeDisabled();
    await userEvent.type(screen.getByTestId("admin-confirm-count"), "3");
    expect(screen.getByTestId("admin-confirm-broadcast")).toBeDisabled();
    await userEvent.clear(screen.getByTestId("admin-confirm-count"));
    await userEvent.type(screen.getByTestId("admin-confirm-count"), "2");
    await userEvent.click(screen.getByTestId("admin-confirm-broadcast"));
    await waitFor(() => expect(calls.some((c) => c.action === "broadcast" && c.confirm_count === 2 && !c.dry_run)).toBe(true));
  });

  it("weekly note: preview then send now", async () => {
    const { call, calls } = fakeCall({
      weekly_preview: () => ({ status: 200, body: { ok: true, note: { title: "로운, 17개월", body: "이번 주 놀이: 공 굴리기", url: "/play-tips/17/", month: 17 } } }),
      weekly_send: () => ({ status: 200, body: { ok: true, sent: 2, devices: 2 } }),
    });
    render(<AdminScreen call={call} onSignOut={() => {}} />);
    await userEvent.click(await screen.findByTestId("tab-weekly"));
    await userEvent.click(screen.getByTestId("weekly-preview"));
    expect(await screen.findByTestId("weekly-lock")).toHaveTextContent("로운, 17개월");
    await userEvent.click(screen.getByTestId("weekly-send"));
    expect(await screen.findByTestId("admin-result")).toHaveTextContent("2 of 2");
    expect(calls.find((c) => c.action === "weekly_send")).toMatchObject({ recipient: recipients[0].key });
  });
});
