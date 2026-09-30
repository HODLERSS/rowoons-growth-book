// APNs for the admin API (Node): what is sent, to which host, and what an answer means for the token. Everything
// here except `http2Transport` is pure and unit-tested (apns.test.ts) without Apple.
//
// Token hosts: a build run from Xcode (and the simulator) registers with the sandbox, TestFlight and App Store
// builds with production, and a token only works on the host that issued it. The app reports its environment
// with the token (push_devices.environment); a BadDeviceToken is retried once on the other host before the token
// is judged dead, which also repairs a row filed under the wrong environment.
import { connect, type ClientHttp2Session } from "node:http2";
import { createPrivateKey, sign } from "node:crypto";

export type ApnsEnv = "production" | "sandbox";
export const APNS_HOST: Record<ApnsEnv, string> = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
};
export const otherEnv = (e: ApnsEnv): ApnsEnv => (e === "production" ? "sandbox" : "production");
export const asEnv = (v: unknown): ApnsEnv => (v === "sandbox" ? "sandbox" : "production");

export type Note = { title: string; body: string; url: string };
export type ApnsConfig = { keyId: string; teamId: string; p8: string; bundleId: string };
export type Answer = { status: number; apnsId: string | null; reason: string | null };
/** One POST to APNs. Injected so tests never reach Apple. */
export type Transport = { post(env: ApnsEnv, token: string, headers: Record<string, string>, body: string): Promise<Answer>; close(): void };

// ---------- provider token ----------

/** ES256 provider token. Node signs with the raw r||s pair JWS wants when asked for ieee-p1363. */
export function mintApnsJwt(cfg: Pick<ApnsConfig, "keyId" | "teamId" | "p8">, iat: number): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "ES256", kid: cfg.keyId })}.${b64({ iss: cfg.teamId, iat })}`;
  const key = createPrivateKey(cfg.p8.replace(/\\n/g, "\n"));
  return `${unsigned}.${sign("sha256", Buffer.from(unsigned), { key, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
}

/** Reused while under 40 minutes old: Apple rejects tokens over an hour and throttles changes more often than 20. */
export const JWT_REUSE_S = 40 * 60;
export const jwtReusable = (cached: { jwt: string; iat: number; key_id: string } | null, keyId: string, nowS: number): boolean =>
  !!cached && !!cached.jwt && cached.key_id === keyId && nowS - cached.iat >= 0 && nowS - cached.iat < JWT_REUSE_S;

// ---------- payload ----------

export function apnsPayload(n: Note, kind: string): Record<string, unknown> {
  return { aps: { alert: { title: n.title, body: n.body }, sound: "default", "thread-id": "sprout-notes" }, url: n.url, kind };
}

export function apnsHeaders(jwt: string, bundleId: string): Record<string, string> {
  return {
    authorization: `bearer ${jwt}`,
    "apns-topic": bundleId,
    "apns-push-type": "alert",
    "apns-priority": "10",
    "content-type": "application/json",
  };
}

// ---------- sending ----------

export const isDeadReason = (status: number, reason: string | null): boolean =>
  status === 410 || reason === "Unregistered" || reason === "BadDeviceToken" || reason === "DeviceTokenNotForTopic";
const retryable = (status: number) => status === 429 || status >= 500 || status === 0;

export type IosResult = { tail: string; environment: ApnsEnv; status: number; apnsId: string | null; reason: string | null; ok: boolean; dead: boolean; envFixed?: ApnsEnv };

/** One device: retry a transient failure once; on BadDeviceToken try the other host before calling it dead. */
export async function sendOne(t: Transport, token: string, env: ApnsEnv, headers: Record<string, string>, body: string, sleep: (ms: number) => Promise<void>): Promise<IosResult> {
  let r = await t.post(env, token, headers, body);
  if (retryable(r.status)) {
    await sleep(400);
    r = await t.post(env, token, headers, body);
  }
  let used = env;
  let envFixed: ApnsEnv | undefined;
  if (r.status === 400 && r.reason === "BadDeviceToken") {
    const alt = await t.post(otherEnv(env), token, headers, body);
    if (alt.status === 200) {
      r = alt;
      used = otherEnv(env);
      envFixed = used;
    }
  }
  const ok = r.status === 200;
  return { tail: token.slice(-6), environment: used, status: r.status, apnsId: r.apnsId, reason: r.reason, ok, dead: !ok && isDeadReason(r.status, r.reason), ...(envFixed ? { envFixed } : {}) };
}

/** The real transport: one HTTP/2 session per host for the whole request, closed at the end. */
export function http2Transport(timeoutMs = 10_000): Transport {
  const sessions = new Map<ApnsEnv, ClientHttp2Session>();
  const session = (env: ApnsEnv) => {
    let s = sessions.get(env);
    if (!s || s.closed || s.destroyed) {
      s = connect(APNS_HOST[env]);
      s.on("error", () => {});
      sessions.set(env, s);
    }
    return s;
  };
  return {
    post(env, token, headers, body) {
      return new Promise<Answer>((resolve) => {
        let settled = false;
        const done = (a: Answer) => {
          if (!settled) {
            settled = true;
            resolve(a);
          }
        };
        try {
          const req = session(env).request({ ":method": "POST", ":path": `/3/device/${token}`, ...headers });
          let status = 0;
          let apnsId: string | null = null;
          let data = "";
          req.setTimeout(timeoutMs, () => {
            req.close();
            done({ status: 0, apnsId: null, reason: "timeout" });
          });
          req.on("response", (h) => {
            status = Number(h[":status"] ?? 0);
            apnsId = (h["apns-id"] as string | undefined) ?? null;
          });
          req.setEncoding("utf8");
          req.on("data", (c: string) => (data += c));
          req.on("end", () => {
            let reason: string | null = null;
            if (status !== 200) {
              try {
                reason = (JSON.parse(data) as { reason?: string }).reason ?? null;
              } catch {
                reason = null;
              }
            }
            done({ status, apnsId, reason });
          });
          req.on("error", (e) => done({ status: 0, apnsId: null, reason: e.message.slice(0, 120) }));
          req.end(body);
        } catch (e) {
          done({ status: 0, apnsId: null, reason: e instanceof Error ? e.message.slice(0, 120) : "network" });
        }
      });
    },
    close() {
      for (const s of sessions.values()) s.close();
      sessions.clear();
    },
  };
}
