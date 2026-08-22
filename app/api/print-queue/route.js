import { NextResponse } from "next/server";
import { db } from "../../../lib/store.js";

// Kitchen printer bridge polls this endpoint. Returns any queued ESC/POS jobs
// (base64 raw bytes) that haven't been sent to the thermal printer yet.
export async function GET() {
  const jobs = db.printQueue.filter(j => !j.sent);
  return NextResponse.json({ jobs });
}

export async function POST(req) {
  // printer bridge marks a job as printed
  const { orderId } = await req.json();
  const j = db.printQueue.find(x => x.orderId === orderId);
  if (j) j.sent = true;
  const o = db.orders.find(x => x.id === orderId);
  if (o) o.printed = true;
  return NextResponse.json({ ok: true });
}
