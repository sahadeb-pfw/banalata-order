import { NextResponse } from "next/server";
import { dailySales } from "../../../lib/store.js";

export async function GET() {
  const days = dailySales();
  const today = days[0] || { date: "-", orders: 0, items: 0, subtotal: 0, gst: 0, total: 0 };
  const grandOrders = days.reduce((s, d) => s + d.orders, 0);
  const grandTotal  = days.reduce((s, d) => s + d.total, 0);
  return NextResponse.json({ today, days, grandOrders, grandTotal });
}
