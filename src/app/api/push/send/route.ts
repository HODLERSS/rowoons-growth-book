import { NextResponse } from "next/server";
import { createClient } from "@vercel/kv";
import webpush from "web-push";

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
    const { password, title, body, endpoints } = await request.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    const kv = createClient({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    const allSubscriptions: PushSubscriptionJSON[] = (await kv.get(KV_KEY)) || [];

    // If specific endpoints provided, filter to only those
    const targets = endpoints?.length
      ? allSubscriptions.filter((s) => (endpoints as string[]).includes(s.endpoint))
      : allSubscriptions;

    if (targets.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: "No subscribers" });
    }

    let sent = 0;
    let failed = 0;
    const expired: string[] = [];

    const payload = JSON.stringify({ title: title || "Rowoon's Growth Book", body });

    await Promise.all(
      targets.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
          sent++;
        } catch (err: unknown) {
          failed++;
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) {
            expired.push(sub.endpoint);
          }
        }
      })
    );

    if (expired.length > 0) {
      const cleaned = allSubscriptions.filter((s) => !expired.includes(s.endpoint));
      await kv.set(KV_KEY, cleaned);
    }

    return NextResponse.json({ sent, failed });
  } catch (err) {
    console.error("Push send error:", err);
    const message = err instanceof Error ? err.message : "Failed to send";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
