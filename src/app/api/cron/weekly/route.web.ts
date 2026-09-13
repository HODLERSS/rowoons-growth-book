import { NextResponse } from "next/server";
import { runWeekly } from "@/lib/weekly-job.web";

export const maxDuration = 60;

/**
 * Weekly push job. Called hourly by GitHub Actions with `Authorization: Bearer CRON_SECRET`, or by the admin
 * page with the admin password (`force` sends now, ignoring each subscriber's Sunday-9am slot).
 */
async function handle(request: Request) {
  const auth = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  let body: { password?: unknown; force?: unknown; endpoints?: unknown } = {};
  if (request.method === "POST") {
    try {
      body = await request.json();
    } catch {
      body = {};
    }
  }
  const viaCron = !!process.env.CRON_SECRET && auth === process.env.CRON_SECRET;
  const viaAdmin = !!process.env.ADMIN_PASSWORD && body.password === process.env.ADMIN_PASSWORD;
  if (!viaCron && !viaAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runWeekly(new Date(), { force: viaAdmin && body.force === true, onlyEndpoints: Array.isArray(body.endpoints) ? body.endpoints.filter((e): e is string => typeof e === "string") : undefined });
    return NextResponse.json({ ok: true, at: new Date().toISOString(), ...result });
  } catch (err) {
    console.error("Weekly job error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
export const GET = handle;
export const POST = handle;
