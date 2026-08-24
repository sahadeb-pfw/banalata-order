import { NextResponse } from "next/server";
import { createOrder, getOrders } from "../../../lib/store.js";

export async function GET() {
  return NextResponse.json({ orders: getOrders() });
}

export async function POST(req) {
  const body = await req.json();
  if (!body?.table || !Array.isArray(body?.items) || body.items.length === 0) {
    return NextResponse.json({ error: "table + items required" }, { status: 400 });
  }
  const order = createOrder({
    table: body.table,
    items: body.items,
    note:  body.note,
    guestName: body.guestName,
  });
  return NextResponse.json({ order });
}
