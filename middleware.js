// Basic-Auth gate for staff pages (/kitchen, /admin). Guests are never affected.
// Set STAFF_USER / STAFF_PASS in Vercel env vars to enable it; if unset, pages stay open.
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/kitchen/:path*", "/admin/:path*"],
};

export function middleware(req) {
  const user = process.env.STAFF_USER;
  const pass = process.env.STAFF_PASS;
  if (!user || !pass) return NextResponse.next();

  const h = req.headers.get("authorization") || "";
  if (h.startsWith("Basic ")) {
    const [u, p] = atob(h.slice(6)).split(":");
    if (u === user && p === pass) return NextResponse.next();
  }
  return new NextResponse("Auth required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Banalata Staff"' },
  });
}
