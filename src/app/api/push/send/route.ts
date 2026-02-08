import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import webpush from "web-push";

const KV_KEY = "push:subscriptions";

interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  try {
    const { password, title, body } = await request.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    const subscriptions: PushSubscriptionJSON[] = (await kv.get(KV_KEY)) || [];

    if (subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, error: "No subscribers" });
    }

    let sent = 0;
    let failed = 0;
    const expired: string[] = [];

    const payload = JSON.stringify({ title: title || "Rowoon's Growth Book", body });

    await Promise.all(
      subscriptions.map(async (sub) => {
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
      const cleaned = subscriptions.filter((s) => !expired.includes(s.endpoint));
      await kv.set(KV_KEY, cleaned);
    }

    return NextResponse.json({ sent, failed });
  } catch {
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
