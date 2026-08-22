import { NextResponse } from "next/server";
import { updateStatus, db } from "../../../../lib/store.js";

export async function PATCH(req, { params }) {
  const { status } = await req.json();
  const o = updateStatus(params.id, status);
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ order: o });
}

export async function GET(_, { params }) {
  const o = db.orders.find(x => x.id === params.id);
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ order: o });
}
