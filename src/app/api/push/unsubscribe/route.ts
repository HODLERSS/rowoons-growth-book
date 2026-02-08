import { NextResponse } from "next/server";
import { createClient } from "@vercel/kv";

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
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    }

    const kv = createClient({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    const existing: PushSubscriptionJSON[] = (await kv.get(KV_KEY)) || [];
    const filtered = existing.filter((s) => s.endpoint !== endpoint);
    await kv.set(KV_KEY, filtered);

    return NextResponse.json({ ok: true, removed: existing.length - filtered.length });
  } catch {
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
