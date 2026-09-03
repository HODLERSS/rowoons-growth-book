import { NextResponse } from "next/server";
import { readSubscriptions } from "@/lib/push-store.web";

export async function POST(request: Request) {
  try {
    const { password } = (await request.json()) as { password?: unknown };
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const subscriptions = await readSubscriptions();
    // A safe summary: endpoint host and a short id, never the keys.
    const subscribers = subscriptions.map((sub, i) => ({ id: i, endpoint: sub.endpoint, domain: new URL(sub.endpoint).hostname, shortId: sub.endpoint.slice(-8) }));
    return NextResponse.json({ subscribers, total: subscribers.length, count: subscribers.length });
  } catch (err) {
    console.error("List subscribers error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to list" }, { status: 500 });
  }
}
