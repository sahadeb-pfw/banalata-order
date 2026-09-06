export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { registerKitchen, unregisterKitchen } from "../../../../lib/notifications.js";

export async function GET() {
  // Disable SSE in production/serverless (Vercel) to avoid long-lived workers during build.
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'SSE disabled in production' }, { status: 501 });
  }

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
