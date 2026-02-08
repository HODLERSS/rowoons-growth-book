import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KV_KEY = "push:subscriptions";

interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function POST(request: Request) {
  try {
    const subscription: PushSubscriptionJSON = await request.json();

    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const existing: PushSubscriptionJSON[] = (await kv.get(KV_KEY)) || [];
    const deduped = existing.filter((s) => s.endpoint !== subscription.endpoint);
    deduped.push(subscription);
    await kv.set(KV_KEY, deduped);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
