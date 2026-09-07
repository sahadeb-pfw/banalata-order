// Lightweight server-side notification hub using Server-Sent Events (SSE).
// Stores active client writers in a global so multiple route handlers can broadcast.
const g = globalThis;
if (!g.__BANALATA_NOTIF__) {
  g.__BANALATA_NOTIF__ = {
    kitchen: new Set(),        // set of { writer, pingInterval }
    orders: new Map(),         // orderId -> Set of { writer, pingInterval }
  };
}

export const notif = g.__BANALATA_NOTIF__;
const enc = new TextEncoder();

function writeRaw(writer, str) {
  return writer.write(enc.encode(str));
}

function writeEvent(writer, event, data) {
  const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
  return writeRaw(writer, payload);
}

export function registerKitchen(writer) {
  notif.kitchen.add(writer);
}

export function unregisterKitchen(writer) {
  notif.kitchen.delete(writer);
}

export function registerOrder(orderId, writer) {
  if (!notif.orders.has(orderId)) notif.orders.set(orderId, new Set());
  notif.orders.get(orderId).add(writer);
}

export function unregisterOrder(orderId, writer) {
  const s = notif.orders.get(orderId);
  if (!s) return;
  s.delete(writer);
  if (s.size === 0) notif.orders.delete(orderId);
}

export function broadcastKitchen(event, data) {
  for (const w of Array.from(notif.kitchen)) {
    try { writeEvent(w, event, data); } catch (e) { /* ignore */ }
  }
}

export function broadcastOrder(orderId, event, data) {
  const s = notif.orders.get(orderId);
  if (!s) return;
  for (const w of Array.from(s)) {
    try { writeEvent(w, event, data); } catch (e) { /* ignore */ }
  }
}
