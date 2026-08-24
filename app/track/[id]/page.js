"use client";
import { useEffect, useState } from "react";
import { RESORT } from "../../../lib/menu.js";

const STEPS = [
  { key: "NEW",       icon: "📝", en: "Order placed",  hi: "ऑर्डर मिला",       bn: "অর্ডার এসেছে",   desc_en: "Reception received your order and bill is printing." },
  { key: "PREPARING", icon: "🍳", en: "Preparing",     hi: "बन रहा है",         bn: "রান্না হচ্ছে",    desc_en: "Chef has started cooking your food." },
  { key: "READY",     icon: "🔔", en: "Ready",         hi: "तैयार",             bn: "প্রস্তুত",         desc_en: "Food is ready and a steward is coming to your table." },
  { key: "SERVED",    icon: "🍽️", en: "Served",        hi: "परोसा गया",         bn: "পরিবেশিত",       desc_en: "Enjoy your meal! Aabar aashben 🙏" },
];

export default function TrackPage({ params }) {
  const { id } = params;
  const [order, setOrder]   = useState(null);
  const [error, setError]   = useState("");
  const [ticker, setTicker] = useState(0);          // triggers minute-updates for "5 min ago"
  const rupee = (n) => "₹" + n.toLocaleString("en-IN");

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const r = await fetch(`/api/orders/${id}`, { cache: "no-store" });
        if (!r.ok) { if (alive) setError("Order not found."); return; }
        const j = await r.json();
        if (alive) { setOrder(j.order); setError(""); }
      } catch {
        if (alive) setError("Network issue — retrying…");
      }
    }
    tick();
    const t = setInterval(tick, 3000);
    const t2 = setInterval(() => setTicker(x => x + 1), 30_000);
    return () => { alive = false; clearInterval(t); clearInterval(t2); };
  }, [id]);

  if (error && !order) {
    return (
      <main className="parchment min-h-screen flex items-center justify-center p-6">
        <div className="bg-white border border-brand-200 rounded-2xl p-8 max-w-md text-center shadow">
          <div className="text-5xl mb-3">🔍</div>
          <h1 className="font-display text-2xl text-brand-800">{error}</h1>
          <p className="text-brand-700 text-sm mt-2">Order ID <b>{id}</b> could not be found.</p>
          <a href={`tel:${RESORT.receptionPhone}`}
            className="mt-6 inline-flex items-center gap-2 bg-forest-500 hover:bg-forest-700 text-white font-semibold px-6 py-3 rounded-xl">
            📞 Call Reception
          </a>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="parchment min-h-screen flex items-center justify-center p-6">
        <div className="animate-pulse text-brand-700">Loading order…</div>
      </main>
    );
  }

  const currentIdx = STEPS.findIndex(s => s.key === order.status);
  const isDone     = order.status === "SERVED";
  const history    = order.statusHistory || {};

  return (
    <main className="parchment min-h-screen">
      {/* header */}
      <header className="bg-gradient-to-b from-brand-800 to-brand-700 text-brand-50 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-5 text-center">
          <p className="tracking-[0.4em] text-brand-200 text-[10px]">TRACK YOUR ORDER</p>
          <h1 className="font-display text-2xl md:text-3xl mt-1">Banalata Hotel &amp; Resort</h1>
          <div className="gold-line w-32 mx-auto my-2" />
          <p className="text-sm text-brand-100">
            Table <b className="bg-brand-50 text-brand-800 px-2 py-0.5 rounded">#{order.table}</b>
            &nbsp;·&nbsp; {order.id}
          </p>
          {order.guestName && (
            <p className="text-brand-100 text-sm mt-1">👤 {order.guestName}</p>
          )}
        </div>
      </header>

      <section className="max-w-2xl mx-auto p-4 md:p-6">

        {/* status banner */}
        <div className={`rounded-2xl p-6 text-center shadow border-2 ${
          isDone ? "bg-green-50 border-green-500 text-green-900" :
          "bg-white border-brand-300 text-brand-800"
        }`}>
          <div className="text-5xl">{STEPS[currentIdx]?.icon}</div>
          <div className="font-display text-3xl mt-2">{STEPS[currentIdx]?.en}</div>
          <div className="text-sm mt-1 opacity-80">{STEPS[currentIdx]?.desc_en}</div>
          {!isDone && (
            <div className="text-xs mt-3 flex items-center justify-center gap-1 text-brand-600">
              <span className="inline-block w-2 h-2 rounded-full bg-brand-500 animate-ping" />
              Live · auto-updating every 3s
              <span className="hidden">{ticker}</span>
            </div>
          )}
        </div>

        {/* timeline */}
        <ol className="mt-8 relative border-l-2 border-brand-200 ml-4 space-y-6">
          {STEPS.map((s, i) => {
            const done   = i <= currentIdx;
            const active = i === currentIdx && !isDone;
            const ts     = history[s.key];
            return (
              <li key={s.key} className="ml-6">
                <span className={`absolute -left-[13px] flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-brand-50 text-sm ${
                  done ? "bg-brand-700 text-white" : "bg-white border border-brand-300 text-brand-400"
                } ${active ? "animate-pulse" : ""}`}>
                  {done ? "✓" : i + 1}
                </span>
                <div className={`${done ? "text-brand-900" : "text-brand-400"}`}>
                  <div className="flex items-center gap-2 font-semibold">
                    <span>{s.icon}</span>
                    <span>{s.en}</span>
                    <span className="text-xs text-brand-500 font-normal">
                      · {s.hi} · {s.bn}
                    </span>
                  </div>
                  {ts && (
                    <div className="text-xs text-brand-500 mt-0.5">
                      {new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      &nbsp;· {relTime(ts)}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* order items */}
        <div className="mt-8 bg-white rounded-2xl border border-brand-200 p-5">
          <h3 className="font-display text-lg text-brand-800 mb-2">Order summary</h3>
          <ul className="divide-y divide-brand-100 text-sm">
            {order.items.map((it, i) => (
              <li key={i} className="py-2">
                <div className="flex justify-between">
                  <span>{it.name_en}{it.portion === "half" ? " (Half)" : ""} × {it.count}</span>
                  <span className="font-medium">{rupee(it.unitPrice * it.count)}</span>
                </div>
                {it.note && <div className="text-xs text-brand-500 italic">📝 {it.note}</div>}
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-dashed border-brand-200 text-sm">
            <Row l="Subtotal" v={rupee(order.subtotal)} />
            <Row l={`CGST ${RESORT.cgstPct}% + SGST ${RESORT.sgstPct}%`} v={rupee(order.cgst + order.sgst)} small />
            <Row l="Total incl. GST" v={rupee(order.total)} bold />
          </div>
        </div>

        {/* actions */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a href={`/menu?table=${order.table}`}
            className="bg-white border border-brand-400 hover:bg-brand-50 text-brand-800 px-4 py-2.5 rounded-lg text-center font-semibold">
            ← Back to menu
          </a>
          <a href={`tel:${RESORT.receptionPhone}`}
            className="bg-forest-500 hover:bg-forest-700 text-white px-4 py-2.5 rounded-lg text-center font-semibold">
            📞 Call Reception
          </a>
        </div>
      </section>
    </main>
  );
}

function Row({ l, v, small, bold }) {
  return (
    <div className={`flex justify-between ${small ? "text-xs text-brand-600" : ""} ${bold ? "font-bold text-brand-800 text-lg mt-1" : ""}`}>
      <span>{l}</span><span>{v}</span>
    </div>
  );
}

function relTime(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60)     return "just now";
  if (s < 3600)   return `${Math.round(s / 60)} min ago`;
  if (s < 86400)  return `${Math.round(s / 3600)} h ago`;
  return new Date(ts).toLocaleDateString("en-IN");
}
