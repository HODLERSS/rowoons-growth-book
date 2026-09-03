import { NextResponse } from "next/server";
import { removeSubscription } from "@/lib/push-store.web";

export async function POST(request: Request) {
  try {
    const { endpoint } = (await request.json()) as { endpoint?: unknown };
    if (typeof endpoint !== "string" || !endpoint) return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    const removed = await removeSubscription(endpoint);
    return NextResponse.json({ ok: true, removed: removed ? 1 : 0 });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
