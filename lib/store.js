// In-memory order store (demo). In production swap for Postgres / Redis.
import { RESORT } from "./menu.js";

const g = globalThis;
if (!g.__BANALATA__) {
  g.__BANALATA__ = {
    orders: [],       // full order objects (see createOrder)
    counter: 1001,
    printQueue: [],   // ESC/POS byte payloads ready for a real thermal printer
  };
}
export const db = g.__BANALATA__;

export const STATUSES = ["NEW", "PREPARING", "READY", "SERVED"];

export function createOrder({ table, items, note }) {
  const subtotal = items.reduce((s, it) => s + it.unitPrice * it.count, 0);
  const cgst = +(subtotal * RESORT.cgstPct / 100).toFixed(2);
  const sgst = +(subtotal * RESORT.sgstPct / 100).toFixed(2);
  const service = +(subtotal * RESORT.serviceChargePct / 100).toFixed(2);
  const total = Math.round(subtotal + cgst + sgst + service);
  const id = "BNL-" + db.counter++;
  const now = Date.now();
  const order = {
    id,
    table,
    // items may carry per-item `note` field. Accept it, ignore blank.
    items: items.map(it => ({ ...it, note: (it.note || "").trim() })),
    note: (note || "").trim(),
    subtotal,
    cgst, sgst, service,
    total,
    status: "NEW",
    createdAt: now,
    // status change timestamps used by the guest tracking page.
    statusHistory: { NEW: now, PREPARING: null, READY: null, SERVED: null },
    printed: false,
  };
  db.orders.unshift(order);
  db.printQueue.push({ orderId: id, payload: buildEscPos(order), createdAt: now });
  return order;
}

export function getOrders() {
  return db.orders;
}

export function getOrder(id) {
  return db.orders.find(x => x.id === id) || null;
}

export function updateStatus(id, status) {
  if (!STATUSES.includes(status)) return null;
  const o = db.orders.find(x => x.id === id);
  if (!o) return null;
  o.status = status;
  if (!o.statusHistory) o.statusHistory = {};
  o.statusHistory[status] = Date.now();
  return o;
}

// ------------- daily sales summary -------------
// Groups SERVED orders by local (Asia/Kolkata) date. Returns list newest-first.
export function dailySales() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const by = new Map();
  for (const o of db.orders) {
    if (o.status !== "SERVED") continue;
    const date = fmt.format(new Date(o.createdAt)); // YYYY-MM-DD
    if (!by.has(date)) by.set(date, { date, orders: 0, items: 0, subtotal: 0, gst: 0, total: 0 });
    const d = by.get(date);
    d.orders += 1;
    d.items  += o.items.reduce((s, it) => s + it.count, 0);
    d.subtotal += o.subtotal;
    d.gst      += (o.cgst + o.sgst);
    d.total    += o.total;
  }
  return Array.from(by.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ------------- ESC/POS builder (80mm thermal printer) -------------
// Produces raw bytes a real ESC/POS printer prints. Works with node-thermal-printer,
// escpos-usb, escpos-network on the kitchen server. Here we just save/preview it.
export function buildEscPos(order) {
  const ESC = 0x1b, GS = 0x1d, LF = 0x0a;
  const bytes = [];
  const push = (...b) => bytes.push(...b);
  const text = (s) => { for (const c of Buffer.from(s, "utf8")) bytes.push(c); };

  push(ESC, 0x40);                       // init
  push(ESC, 0x61, 0x01);                 // center
  push(ESC, 0x21, 0x30);                 // double h+w
  text(RESORT.name); push(LF);
  push(ESC, 0x21, 0x00);                 // normal
  text(RESORT.address); push(LF);
  text(`GSTIN: ${RESORT.gstin}   FSSAI: ${RESORT.fssai}`); push(LF);
  text("--------------------------------"); push(LF);
  push(ESC, 0x21, 0x10); text(`TABLE  ${order.table}    ${order.id}`); push(LF);
  push(ESC, 0x21, 0x00);
  text(new Date(order.createdAt).toLocaleString("en-IN")); push(LF);
  text("--------------------------------"); push(LF);
  push(ESC, 0x61, 0x00);                 // left
  text("Item                 Qty   Amt"); push(LF);
  text("--------------------------------"); push(LF);
  for (const it of order.items) {
    const nm = (it.name_en + (it.portion === "half" ? " (H)" : "")).padEnd(20).slice(0, 20);
    const q  = String(it.count).padStart(3);
    const a  = ("₹" + (it.unitPrice * it.count)).padStart(7);
    text(`${nm} ${q}  ${a}`); push(LF);
    if (it.note) { text(`   * ${it.note}`.slice(0, 32)); push(LF); }
  }
  text("--------------------------------"); push(LF);
  const line = (l, v) => { text(l.padEnd(24) + ("₹" + v).padStart(8)); push(LF); };
  line("Subtotal",  order.subtotal);
  line(`CGST ${RESORT.cgstPct}%`, order.cgst);
  line(`SGST ${RESORT.sgstPct}%`, order.sgst);
  push(ESC, 0x21, 0x10);
  line("TOTAL", order.total);
  push(ESC, 0x21, 0x00);
  if (order.note) { text("--------------------------------"); push(LF); text("Note: " + order.note); push(LF); }
  text("--------------------------------"); push(LF);
  push(ESC, 0x61, 0x01);
  text("Thank you • Aabar aashben"); push(LF);
  text("banalataresort.com"); push(LF); push(LF); push(LF);
  push(GS, 0x56, 0x00);                  // full cut
  return Buffer.from(bytes).toString("base64");
}
