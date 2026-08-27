import { registerKitchen, unregisterKitchen } from "../../../../lib/notifications.js";

export async function GET() {
  const t = new TransformStream();
  const writer = t.writable.getWriter();
  const enc = new TextEncoder();

  // send a comment to establish the stream
  writer.write(enc.encode(': connected\n\n'));
  registerKitchen(writer);

  // heartbeat
  const ping = setInterval(() => {
    try { writer.write(enc.encode(': ping\n\n')); } catch (e) { /* ignore */ }
  }, 20_000);

  writer.closed.then(() => {
    clearInterval(ping);
    unregisterKitchen(writer);
  }).catch(() => {
    clearInterval(ping);
    unregisterKitchen(writer);
  });

  return new Response(t.readable, {
    status: 200,
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
