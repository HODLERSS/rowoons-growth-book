import { describe, expect, it } from "vitest";
import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { apnsHeaders, apnsPayload, asEnv, isDeadReason, jwtReusable, JWT_REUSE_S, mintApnsJwt, sendOne, type Answer, type ApnsEnv, type Transport } from "./apns";

describe("provider token", () => {
  it("is a valid ES256 JWT signed by the key, with kid and iss", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const p8 = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const jwt = mintApnsJwt({ keyId: "6NC7T26GLR", teamId: "5RCPL9J3UX", p8 }, 1_800_000_000);
    const [h, p, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ alg: "ES256", kid: "6NC7T26GLR" });
    expect(JSON.parse(Buffer.from(p, "base64url").toString())).toEqual({ iss: "5RCPL9J3UX", iat: 1_800_000_000 });
    const ok = verify("sha256", Buffer.from(`${h}.${p}`), { key: createPublicKey(publicKey.export({ type: "spki", format: "pem" })), dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"));
    expect(ok).toBe(true);
    // a key pasted with literal \n (how env vars sometimes arrive) still works
    expect(mintApnsJwt({ keyId: "k", teamId: "t", p8: p8.replace(/\n/g, "\\n") }, 1).split(".")).toHaveLength(3);
  });
  it("is reused only for the same key and under 40 minutes", () => {
    const c = { jwt: "j", iat: 1000, key_id: "K" };
    expect(jwtReusable(c, "K", 1000 + JWT_REUSE_S - 1)).toBe(true);
    expect(jwtReusable(c, "K", 1000 + JWT_REUSE_S)).toBe(false);
    expect(jwtReusable(c, "OTHER", 1001)).toBe(false);
    expect(jwtReusable(c, "K", 999)).toBe(false);
    expect(jwtReusable(null, "K", 1000)).toBe(false);
  });
});

describe("payload", () => {
  it("is an alert with the in-app url at the top level", () => {
    expect(apnsPayload({ title: "T", body: "B", url: "/memo/" }, "admin_test")).toEqual({
      aps: { alert: { title: "T", body: "B" }, sound: "default", "thread-id": "sprout-notes" }, url: "/memo/", kind: "admin_test",
    });
    expect(apnsHeaders("jwt", "co.minjae.sprout")).toEqual({
      authorization: "bearer jwt", "apns-topic": "co.minjae.sprout", "apns-push-type": "alert", "apns-priority": "10", "content-type": "application/json",
    });
  });
  it("classifies dead tokens", () => {
    expect(isDeadReason(410, "Unregistered")).toBe(true);
    expect(isDeadReason(400, "BadDeviceToken")).toBe(true);
    expect(isDeadReason(400, "DeviceTokenNotForTopic")).toBe(true);
    expect(isDeadReason(400, "PayloadTooLarge")).toBe(false);
    expect(isDeadReason(403, "InvalidProviderToken")).toBe(false);
    expect(asEnv("sandbox")).toBe("sandbox");
    expect(asEnv("anything")).toBe("production");
  });
});

describe("sendOne", () => {
  const fake = (answers: ((env: ApnsEnv) => Answer)[]) => {
    const calls: ApnsEnv[] = [];
    const t: Transport = { post: async (env) => { calls.push(env); return answers[Math.min(calls.length - 1, answers.length - 1)](env); }, close: () => {} };
    return { t, calls };
  };
  const noSleep = async () => {};
  it("retries a transient failure once", async () => {
    const { t, calls } = fake([() => ({ status: 503, apnsId: null, reason: "ServiceUnavailable" }), () => ({ status: 200, apnsId: "a", reason: null })]);
    const r = await sendOne(t, "ab".repeat(32), "production", {}, "{}", noSleep);
    expect(r).toMatchObject({ ok: true, status: 200, dead: false });
    expect(calls).toEqual(["production", "production"]);
  });
  it("tries the other host on BadDeviceToken before judging the token dead", async () => {
    const bad = { t: fake([() => ({ status: 400, apnsId: null, reason: "BadDeviceToken" })]) };
    const r = await sendOne(bad.t.t, "cd".repeat(32), "sandbox", {}, "{}", noSleep);
    expect(bad.t.calls).toEqual(["sandbox", "production"]);
    expect(r).toMatchObject({ ok: false, dead: true, tail: "cdcdcd" });
    const fix = fake([() => ({ status: 400, apnsId: null, reason: "BadDeviceToken" }), () => ({ status: 200, apnsId: "b", reason: null })]);
    expect(await sendOne(fix.t, "ef".repeat(32), "production", {}, "{}", noSleep)).toMatchObject({ ok: true, environment: "sandbox", envFixed: "sandbox" });
  });
});
