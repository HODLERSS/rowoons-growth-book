import { test, expect } from "@playwright/test";
import { createUser, OWNER, PAT, SERVICE, setAllowlist, signIn, sql, svc, URL_ } from "./helpers";

// The deployed admin site, end to end: signed out shows only sign-in, a non-admin is refused, an admin can see the
// overview and dry-run every send path. The admin is a disposable user (service role), allowlisted through the
// Vault secret admin_emails for this run and removed afterwards; that needs SUPABASE_ACCESS_TOKEN (Management API).
test("signed out: only the sign-in card, hidden from search", async ({ page, request }) => {
  const apiCalls: string[] = [];
  page.on("request", (r) => r.url().includes("/api/admin") && apiCalls.push(r.url()));
  const res = await page.goto("/");
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  expect(res?.headers()["x-frame-options"]).toBe("DENY");
  expect(res?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  await expect(page.getByTestId("admin-signin")).toBeVisible();
  await expect(page.getByTestId("signin-google")).toBeVisible();
  await expect(page.getByTestId("admin-ready")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(apiCalls).toEqual([]);
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
  await page.screenshot({ path: `test-results/signed-out-${test.info().project.name}.png`, fullPage: true });
});

test("the API refuses a foreign origin and a missing token", async ({ request }) => {
  const foreign = await request.post("/api/admin", { headers: { Origin: "https://baby.minjae.co" }, data: { action: "whoami" } });
  expect(foreign.status()).toBe(403);
  const anon = await request.post("/api/admin", { data: { action: "overview" } });
  expect(anon.status()).toBe(401);
});

test.describe("with accounts", () => {
  test.skip(!URL_ || !SERVICE, "needs the Supabase service role key");

  test("a non-admin account is refused", async ({ page, context }) => {
    const u = await createUser("admin-e2e-denied");
    try {
      await signIn(context, u);
      await page.goto("/");
      await expect(page.getByTestId("admin-denied")).toBeVisible();
      await expect(page.getByTestId("admin-denied")).toContainText("not a Sprout admin");
      await expect(page.getByTestId("admin-ready")).toHaveCount(0);
      await page.screenshot({ path: `test-results/denied-${test.info().project.name}.png`, fullPage: true });
    } finally {
      await svc().auth.admin.deleteUser(u.id);
    }
  });

  test("an allowlisted admin sees the overview and dry-runs every send path", async ({ page, context }) => {
    test.skip(!PAT, "needs SUPABASE_ACCESS_TOKEN to allowlist the disposable admin");
    const u = await createUser("admin-e2e");
    await setAllowlist(`${OWNER},${u.email}`);
    try {
      await signIn(context, u);
      await page.goto("/");
      await expect(page.getByTestId("admin-ready")).toBeVisible();
      await expect(page.getByTestId("stat-accounts")).not.toContainText("–");
      await page.screenshot({ path: `test-results/overview-${test.info().project.name}.png`, fullPage: true });
      // lists never show a baby's name or birth date
      const listText = await page.getByTestId("admin-recipients").innerText();
      expect(listText).not.toMatch(/\d{4}-\d{2}-\d{2}/);

      await page.getByTestId("tab-send").click();
      await page.getByTestId("admin-title").fill("E2E dry run");
      await page.getByTestId("admin-body").fill("This is a dry run from the admin E2E. Nothing is sent.");
      await expect(page.getByTestId("admin-preview")).toContainText("E2E dry run");
      await expect(page.getByTestId("admin-broadcast")).toBeDisabled();
      await page.getByTestId("admin-dry-run").click();
      await expect(page.getByTestId("admin-result")).toContainText("Nothing sent");
      // a real test send to the disposable admin has no device to reach: refused, nothing unlocked
      await page.getByTestId("admin-send-test").click();
      await expect(page.getByTestId("admin-result")).toContainText("No device is linked to your account");
      await expect(page.getByTestId("admin-broadcast")).toBeDisabled();
      await page.screenshot({ path: `test-results/send-${test.info().project.name}.png`, fullPage: true });

      // broadcast dry run through the API with the admin's token: wrong count refused, right count reaches nobody
      const token = await page.evaluate(() => JSON.parse(localStorage.getItem("sprout-admin-auth") ?? "{}").access_token as string);
      const post = (data: Record<string, unknown>) => page.request.post("/api/admin", { headers: { Authorization: `Bearer ${token}`, Origin: new URL(page.url()).origin }, data });
      const wrong = await post({ action: "broadcast", title: "x", body: "y", confirm_count: 999999, dry_run: true });
      expect(wrong.status()).toBe(409);
      const expected = (await wrong.json()).expected as number;
      const dry = await post({ action: "broadcast", title: "x", body: "y", confirm_count: expected, dry_run: true });
      expect(dry.status()).toBe(200);
      expect(await dry.json()).toMatchObject({ dry_run: true, recipients: expected });
      const bad = await post({ action: "send", title: "", body: "y", link: "https://evil.example", recipient: "web:1", dry_run: true });
      expect(bad.status()).toBe(400);

      await page.getByTestId("tab-history").click();
      await expect(page.getByTestId("admin-history")).toBeVisible();
    } finally {
      await setAllowlist(null);
      await svc().from("admin_audit").delete().eq("actor_id", u.id);
      await svc().auth.admin.deleteUser(u.id);
    }
    // the allowlist is back to the owner only
    expect(await sql("select count(*)::int as n from vault.secrets where name = 'admin_emails'")).toEqual([{ n: 0 }]);
  });
});
