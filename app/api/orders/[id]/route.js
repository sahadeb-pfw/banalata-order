import { NextResponse } from "next/server";
import { updateStatus, db } from "../../../../lib/store.js";
import { broadcastKitchen, broadcastOrder } from "../../../../lib/notifications.js";

export async function PATCH(req, { params }) {
  const { status } = await req.json();
  const o = updateStatus(params.id, status);
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });

  // broadcast status change to kitchen and per-order clients
  try {
    broadcastKitchen("order_update", o);
    broadcastOrder(o.id, "order_update", o);
  } catch (e) { /* ignore */ }

  // if moved to SERVED, schedule deletion after 10 minutes and notify sales
  if (status === "SERVED") {
    // immediate notify sales_update so clients can refresh their daily report
    try { broadcastKitchen("sales_update", { id: o.id }); } catch (e) { /* ignore */ }

    const delay = 10 * 60 * 1000; // 10 minutes

    setTimeout(() => {
      const idx = db.orders.findIndex(x => x.id === o.id);
      if (idx !== -1) {
        db.orders.splice(idx, 1);
      }
      // also remove any pending printQueue entries for this order
      db.printQueue = db.printQueue.filter(j => j.orderId !== o.id);

      // notify kitchen clients to remove the order card
      try { broadcastKitchen("order_remove", { id: o.id }); } catch (e) { /* ignore */ }
    }, delay);
  }

  return NextResponse.json({ order: o });
}

export async function GET(_, { params }) {
  const o = db.orders.find(x => x.id === params.id);
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ order: o });
}
