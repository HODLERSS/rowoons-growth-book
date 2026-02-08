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
    const { password } = await request.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kv = createClient({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    const subscriptions: PushSubscriptionJSON[] = (await kv.get(KV_KEY)) || [];

    // Return a safe summary (endpoint domain + short ID, not full keys)
    const subscribers = subscriptions.map((sub, i) => {
      const url = new URL(sub.endpoint);
      return {
        id: i,
        endpoint: sub.endpoint,
        domain: url.hostname,
        shortId: sub.endpoint.slice(-8),
      };
    });

    return NextResponse.json({ subscribers, total: subscribers.length });
  } catch (err) {
    console.error("List subscribers error:", err);
    const message = err instanceof Error ? err.message : "Failed to list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
