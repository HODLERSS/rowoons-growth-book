import { test, expect } from "@playwright/test";
import { seed, pinClock, gotoReady, CURRENT_MONTH, PROFILE } from "./helpers";
import milestonesEn from "../src/content/milestones.json";
import { accountsConfigured, createTestUser, deleteTestUser, signInContext, userRows, rowsAs, magicLink, admin } from "./supabase-admin";

/**
 * Accounts are optional: every guest flow elsewhere in the suite runs with no session. These tests cover the
 * signed-in path end to end against the real backend with disposable users: session bootstrap, first-sign-in
 * merge of on-device data, live mirroring of confirmations and journal entries, a second device seeing the same
 * data, RLS isolation, sign-out keeping the device copy, the magic-link callback, and account deletion.
 */
test.describe("accounts", () => {
  test.skip(!accountsConfigured, "Supabase env not configured");
  const users: string[] = [];
  test.afterAll(async () => {
    for (const id of users) await deleteTestUser(id);
  });

  test("first sign-in uploads the device's records, then confirmations and journal entries mirror live", async ({ browser }) => {
    const user = await createTestUser("merge");
    users.push(user.id);
    const ctx = await browser.newContext();
    await seed(ctx, { milestones: { "m-16-social-1": { completed: true, completedAt: "2026-08-20T00:00:00Z" } }, memos: [{ id: "local-1", title: "Local note", content: "written before sign-in", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" }] });
    await signInContext(ctx, user);
    const page = await ctx.newPage();
    await pinClock(page);
    await gotoReady(page, "/settings/");
    await expect(page.getByText(`Signed in as ${user.email}`)).toBeVisible();

    await expect.poll(async () => Object.keys(await userRows(user.id)).sort(), { timeout: 15_000 }).toEqual(expect.arrayContaining(["memos", "milestones", "profile"]));
    const rows = await userRows(user.id);
    expect((rows.profile as { name: string }).name).toBe(PROFILE.name);
    expect((rows.milestones as Record<string, unknown>)["m-16-social-1"]).toBeTruthy();
    expect((rows.memos as { id: string }[]).map((m) => m.id)).toContain("local-1");

    // A new confirmation on Home reaches the account within a couple of seconds.
    await gotoReady(page, "/");
    const region = page.getByRole("region", { name: "This month" });
    const firstOpen = region.getByRole("button", { name: /^Confirm: / }).first();
    const title = (await firstOpen.getAttribute("aria-label"))!.replace(/^Confirm: /, "");
    await firstOpen.click();
    const id = milestonesEn.find((m) => m.month === CURRENT_MONTH && m.title === title)!.id;
    await expect.poll(async () => !!(((await userRows(user.id)).milestones as Record<string, unknown>) ?? {})[id], { timeout: 15_000 }).toBe(true);

    // A journal entry too.
    await gotoReady(page, "/memo/new/");
    await page.getByPlaceholder("Title…").fill("Synced entry");
    await page.getByPlaceholder(/What happened today/).fill("hello cloud");
    await page.getByRole("button", { name: "Save" }).click();
    await expect.poll(async () => ((await userRows(user.id)).memos as { title: string }[] | undefined)?.some((m) => m.title === "Synced entry") ?? false, { timeout: 15_000 }).toBe(true);
    await ctx.close();
  });

  test("a second device signed into the same account sees the records; sign-out keeps the device copy", async ({ browser }) => {
    const user = await createTestUser("device2");
    users.push(user.id);
    await admin().from("user_data").upsert([
      { user_id: user.id, key: "profile", value: { name: "Cloud Baby", nameKo: "구름이", birthDate: "2025-04-17" } },
      { user_id: user.id, key: "milestones", value: { "m-16-social-1": { completed: true, completedAt: "2026-08-20T00:00:00Z" } } },
      { user_id: user.id, key: "memos", value: [{ id: "cloud-1", title: "From the cloud", content: "x", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" }] },
    ]);
    const ctx = await browser.newContext();
    await seed(ctx, { profile: null }); // brand-new phone: nothing local
    await signInContext(ctx, user);
    const page = await ctx.newPage();
    await pinClock(page);
    await gotoReady(page, "/");
    await expect(page.getByRole("button", { name: "Edit profile" })).toContainText("Cloud Baby", { timeout: 15_000 });
    await gotoReady(page, "/memo/");
    await expect(page.getByText("From the cloud")).toBeVisible();

    await gotoReady(page, "/settings/");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByText("Your records stay on this phone.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await gotoReady(page, "/");
    await expect(page.getByRole("button", { name: "Edit profile" })).toContainText("Cloud Baby");
    expect(await page.evaluate(() => localStorage.getItem("sprout-auth"))).toBeNull();
    await ctx.close();
  });

  test("row-level security: another user cannot read the account's rows", async () => {
    const a = await createTestUser("rls-a");
    const b = await createTestUser("rls-b");
    users.push(a.id, b.id);
    await admin().from("user_data").upsert([{ user_id: a.id, key: "profile", value: { name: "A", birthDate: "2025-04-17" } }]);
    expect(await rowsAs(a, a.id)).toBe(1);
    expect(await rowsAs(b, a.id)).toBe(0);
  });

  test("magic link lands on the callback page and signs the user in", async ({ browser, baseURL }) => {
    const user = await createTestUser("magic");
    users.push(user.id);
    const link = await magicLink(user.email, `${baseURL}/auth/callback/`);
    const ctx = await browser.newContext();
    await seed(ctx);
    const page = await ctx.newPage();
    await page.goto(link);
    await page.waitForURL(/\/($|\?)/, { timeout: 20_000 });
    await gotoReady(page, "/settings/");
    await expect(page.getByText(`Signed in as ${user.email}`)).toBeVisible({ timeout: 15_000 });
    await ctx.close();
  });

  test("delete account removes the auth user and every row, and clears the device", async ({ browser }) => {
    const user = await createTestUser("delete");
    users.push(user.id);
    const ctx = await browser.newContext();
    await seed(ctx);
    await signInContext(ctx, user);
    const page = await ctx.newPage();
    await pinClock(page);
    await gotoReady(page, "/settings/");
    await expect.poll(async () => Object.keys(await userRows(user.id)).length, { timeout: 15_000 }).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Delete account" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Account deleted.")).toBeVisible({ timeout: 15_000 });
    const { data } = await admin().auth.admin.getUserById(user.id);
    expect(data.user).toBeNull();
    expect(Object.keys(await userRows(user.id)).length).toBe(0);
    expect(await page.evaluate(() => localStorage.getItem("sprout:profile"))).toBeNull();
    await ctx.close();
  });

  test("guest Home shows the sign-in invitation once; 'Not now' hides it for good", async ({ context, page }) => {
    await seed(context);
    await pinClock(page);
    await gotoReady(page, "/");
    const card = page.getByRole("region", { name: "Keep a copy in the cloud" });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Not now" }).click();
    await expect(card).toHaveCount(0);
    await page.reload();
    await page.waitForSelector("html[data-hydrated]", { state: "attached" });
    await expect(page.getByRole("region", { name: "Keep a copy in the cloud" })).toHaveCount(0);
  });

  test("sign-in dialog offers Google and an email link, and validates the email", async ({ context, page }) => {
    await seed(context);
    await pinClock(page);
    await gotoReady(page, "/settings/");
    await page.getByRole("button", { name: "Sign in" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await dialog.getByLabel("Email").fill("not-an-email");
    await dialog.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Please enter a valid email.");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
