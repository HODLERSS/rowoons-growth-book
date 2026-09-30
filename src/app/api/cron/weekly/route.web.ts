import { NextResponse } from "next/server";
import { runWeekly } from "@/lib/weekly-job.web";

export const maxDuration = 60;

/**
 * Weekly push job. Called hourly by GitHub Actions with `Authorization: Bearer CRON_SECRET`; nothing else is
 * accepted. Sending a note on demand lives in the separate admin tool (admin/), never in this app.
 */
async function handle(request: Request) {
  const auth = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!process.env.CRON_SECRET || auth !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runWeekly(new Date());
    return NextResponse.json({ ok: true, at: new Date().toISOString(), ...result });
  } catch (err) {
    console.error("Weekly job error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
export const GET = handle;
export const POST = handle;
