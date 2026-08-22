// In-memory order store (demo). In production swap for Postgres / Redis.
import { RESORT } from "./menu.js";

const g = globalThis;
if (!g.__BANALATA__) {
  g.__BANALATA__ = {
    orders: [],       // {id, table, items:[{id,name_en,qty,unitPrice,count,portion}], subtotal, cgst, sgst, total, status, createdAt, printed}
    counter: 1001,
    printQueue: [],   // ESC/POS byte payloads ready for a real thermal printer
  };
}
export const db = g.__BANALATA__;

export function createOrder({ table, items, note }) {
  const subtotal = items.reduce((s, it) => s + it.unitPrice * it.count, 0);
  const cgst = +(subtotal * RESORT.cgstPct / 100).toFixed(2);
  const sgst = +(subtotal * RESORT.sgstPct / 100).toFixed(2);
  const service = +(subtotal * RESORT.serviceChargePct / 100).toFixed(2);
  const total = Math.round(subtotal + cgst + sgst + service);
  const id = "BNL-" + db.counter++;
  const order = {
    id,
    table,
    items,
    note: note || "",
    subtotal,
    cgst, sgst, service,
    total,
    status: "NEW",
    createdAt: Date.now(),
    printed: false,
  };
  db.orders.unshift(order);
  db.printQueue.push({ orderId: id, payload: buildEscPos(order), createdAt: Date.now() });
  return order;
}

export function getOrders() {
  return db.orders;
}

export function updateStatus(id, status) {
  const o = db.orders.find(x => x.id === id);
  if (o) o.status = status;
  return o;
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
  }
  text("--------------------------------"); push(LF);
  const line = (l, v) => { text(l.padEnd(24) + ("₹" + v).padStart(8)); push(LF); };
  line("Subtotal",  order.subtotal);
  line(`CGST ${RESORT.cgstPct}%`, order.cgst);
  line(`SGST ${RESORT.sgstPct}%`, order.sgst);
  push(ESC, 0x21, 0x10);
  line("TOTAL", order.total);
  push(ESC, 0x21, 0x00);
  text("--------------------------------"); push(LF);
  push(ESC, 0x61, 0x01);
  text("Thank you • Aabar aashben"); push(LF);
  text("banalataresort.com"); push(LF); push(LF); push(LF);
  push(GS, 0x56, 0x00);                  // full cut
  return Buffer.from(bytes).toString("base64");
}
