import { NextResponse } from "next/server";
import webpush from "web-push";
import { readSubscriptions, writeSubscriptions } from "@/lib/push-store.web";

export async function POST(request: Request) {
  try {
    const { password, title, body, url, endpoints } = (await request.json()) as { password?: unknown; title?: unknown; body?: unknown; url?: unknown; endpoints?: unknown };
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (typeof body !== "string" || !body.trim()) return NextResponse.json({ error: "Message body is required" }, { status: 400 });

    webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

    const all = await readSubscriptions();
    const only = Array.isArray(endpoints) ? new Set(endpoints.filter((e): e is string => typeof e === "string")) : null;
    const targets = only && only.size ? all.filter((s) => only.has(s.endpoint)) : all;
    if (targets.length === 0) return NextResponse.json({ sent: 0, failed: 0, message: "No subscribers" });

    const payload = JSON.stringify({ title: typeof title === "string" && title ? title : "Sprout", body, url: typeof url === "string" && url.startsWith("/") ? url : "/" });
    let sent = 0;
    let failed = 0;
    const expired: string[] = [];
    await Promise.all(
      targets.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
          sent++;
        } catch (err: unknown) {
          failed++;
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) expired.push(sub.endpoint);
        }
      })
    );
    if (expired.length > 0) await writeSubscriptions(all.filter((s) => !expired.includes(s.endpoint)));
    return NextResponse.json({ sent, failed, expired: expired.length });
  } catch (err) {
    console.error("Push send error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to send" }, { status: 500 });
  }
}
