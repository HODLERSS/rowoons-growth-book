import { NextResponse } from "next/server";
import { addSubscription, isSubscription } from "@/lib/push-store.web";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  if (!isSubscription(body)) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  try {
    await addSubscription(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
