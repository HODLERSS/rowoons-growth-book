import { NextResponse } from "next/server";
import { isSubscription, readSubscriptions, writeSubscriptions } from "@/lib/push-store.web";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  if (!isSubscription(body)) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  try {
    const existing = await readSubscriptions();
    const deduped = existing.filter((s) => s.endpoint !== body.endpoint);
    deduped.push({ endpoint: body.endpoint, keys: { p256dh: body.keys.p256dh, auth: body.keys.auth } });
    await writeSubscriptions(deduped);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
