import { NextResponse } from "next/server";
import { readSubscriptions, writeSubscriptions } from "@/lib/push-store.web";

export async function POST(request: Request) {
  try {
    const { endpoint } = (await request.json()) as { endpoint?: unknown };
    if (typeof endpoint !== "string" || !endpoint) return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    const existing = await readSubscriptions();
    const filtered = existing.filter((s) => s.endpoint !== endpoint);
    if (filtered.length !== existing.length) await writeSubscriptions(filtered);
    return NextResponse.json({ ok: true, removed: existing.length - filtered.length });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
