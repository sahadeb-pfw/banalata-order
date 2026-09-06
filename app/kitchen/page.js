"use client";
import { useEffect, useState } from "react";
import { RESORT } from "../../lib/menu.js";
import Pusher from "pusher-js";

const STATUSES = ["NEW", "PREPARING", "READY", "SERVED"];
const NEXT = { NEW: "PREPARING", PREPARING: "READY", READY: "SERVED" };
const COLOR = {
  NEW:       "bg-red-100 border-red-400 text-red-900",
  PREPARING: "bg-amber-100 border-amber-400 text-amber-900",
  READY:     "bg-green-100 border-green-500 text-green-900",
  SERVED:    "bg-neutral-100 border-neutral-300 text-neutral-500",
};

export default function Kitchen() {
  const [orders,  setOrders]  = useState([]);
  const [sales,   setSales]   = useState(null);
  const [ding,    setDing]    = useState(0);
  const [preview, setPreview] = useState(null);
  const [showSales, setShowSales] = useState(false);
  const [esConnected, setEsConnected] = useState(false);
  const rupee = (n) => "₹" + n.toLocaleString("en-IN");

  async function refresh() {
    const [oRes, sRes] = await Promise.all([
      fetch("/api/orders", { cache: "no-store" }),
      fetch("/api/sales",  { cache: "no-store" }),
    ]);
    const j = await oRes.json();
    const s = await sRes.json();
    setOrders(prev => {
      if (j.orders.length > prev.length) setDing(d => d + 1);
      return j.orders;
    });
    setSales(s);
  }

  useEffect(() => {
    // Initial fetch + polling fallback
    refresh();
    const t = setInterval(refresh, 2000);

    // Prefer Pusher in environments where NEXT_PUBLIC_PUSHER_KEY is provided (preview/prod).
    // Fallback to SSE (EventSource) for local/dev where SSE route is available.
    let es;
    let pusher;
    let kitchenChannel;

    const hasPusher = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PUSHER_KEY;

    if (hasPusher) {
      try {
        pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
          forceTLS: true,
        });
        kitchenChannel = pusher.subscribe('kitchen');

        kitchenChannel.bind('new_order', (o) => {
          setOrders(prev => [o, ...prev]);
          setDing(d => d + 1);
        });

        kitchenChannel.bind('order_update', (o) => {
          setOrders(prev => prev.map(x => x.id === o.id ? o : x));
        });

        kitchenChannel.bind('order_remove', (p) => {
          setOrders(prev => prev.filter(x => x.id !== p.id));
        });

        kitchenChannel.bind('sales_update', () => {
          fetch('/api/sales', { cache: 'no-store' }).then(r => r.json()).then(setSales).catch(() => {});
        });

        pusher.connection.bind('connected', () => setEsConnected(true));
        pusher.connection.bind('disconnected', () => setEsConnected(false));
        pusher.connection.bind('error', () => setEsConnected(false));
      } catch (e) {
        console.warn('pusher not available', e);
      }
    } else {
      try {
        es = new EventSource('/api/events/kitchen');
        // connecting
        setEsConnected(false);

        es.onopen = () => {
          setEsConnected(true);
        };

        es.addEventListener('new_order', e => {
          try {
            const o = JSON.parse(e.data);
            setOrders(prev => [o, ...prev]);
            setDing(d => d + 1);
          } catch (err) { /* ignore malformed */ }
        });

        es.addEventListener('order_update', e => {
          try {
            const o = JSON.parse(e.data);
            setOrders(prev => prev.map(x => x.id === o.id ? o : x));
          } catch (err) {}
        });

        es.addEventListener('order_remove', e => {
          try {
            const p = JSON.parse(e.data);
            setOrders(prev => prev.filter(x => x.id !== p.id));
          } catch (err) {}
        });

        es.addEventListener('sales_update', () => {
          fetch('/api/sales', { cache: 'no-store' }).then(r => r.json()).then(setSales).catch(() => {});
        });

        es.onerror = () => {
          // EventSource auto-reconnects; mark as disconnected until open
          setEsConnected(false);
        };
      } catch (e) {
        console.error('SSE not available', e);
      }
    }

    return () => {
      clearInterval(t);
      try {
        if (es) es.close();
      } catch (_) {}
      try {
        if (kitchenChannel) {
          kitchenChannel.unbind_all && kitchenChannel.unbind_all();
          pusher.unsubscribe && pusher.unsubscribe('kitchen');
        }
        if (pusher) pusher.disconnect && pusher.disconnect();
      } catch (_) {}
    };
  }, []);

  async function advance(o) {
    const nx = NEXT[o.status];
    if (!nx) return;
    await fetch("/api/orders/" + o.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nx }),
    });
    refresh();
  }

  async function downloadKot(o) {
    const r = await fetch("/api/print-queue");
    const j = await r.json();
    const job = j.jobs.find(x => x.orderId === o.id);
    if (!job) { alert("Already printed / no queued job"); return; }
    const bytes = Uint8Array.from(atob(job.payload), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${o.id}.escpos.bin`; a.click();
    await fetch("/api/print-queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: o.id }) });
    refresh();
  }

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100">
      <header className="bg-neutral-800 border-b border-neutral-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className={`inline-block w-3 h-3 rounded-full ${esConnected ? 'bg-green-400' : 'bg-neutral-600'}`} title={esConnected ? 'Live' : 'Disconnected'} />
            <div>
              <h1 className="font-display text-2xl text-amber-200">Banalata KOT · Kitchen Screen</h1>
              <p className="text-xs text-neutral-400">Live orders • auto refresh every 2 s • ding: {ding}</p>
            </div>
          </div>

          {/* Today snapshot in header */}
          {sales && (
            <div className="flex gap-2 items-center">
              <div className="bg-amber-500/20 border border-amber-500 rounded-lg px-3 py-1.5 text-xs">
                <div className="text-amber-200 text-[10px]">TODAY · {sales.today.date}</div>
                <div className="font-bold text-white">
                  {sales.today.orders} served · {rupee(sales.today.total)}
                </div>
              </div>
              <button onClick={() => setShowSales(true)}
                className="bg-neutral-700 hover:bg-neutral-600 text-white text-xs px-3 py-2 rounded-lg border border-neutral-600">
                📊 Daily report
              </button>
            </div>
          )}

          <div className="flex gap-2 text-xs">
            {STATUSES.map(s => (
              <span key={s} className={`px-2 py-1 rounded ${COLOR[s]} border`}>
                {s}: {orders.filter(o => o.status === s).length}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {orders.length === 0 && (
          <div className="col-span-full text-center text-neutral-500 py-20">
            No orders yet. Ask a guest to scan a QR and place one.
          </div>
        )}

        {orders.map(o => (
          <div key={o.id} className={`border-l-8 ${COLOR[o.status]} bg-white text-neutral-900 rounded-lg shadow p-4`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs text-neutral-500">{new Date(o.createdAt).toLocaleTimeString("en-IN")}</div>
                <div className="text-2xl font-bold">Table #{o.table}</div>
                {o.guestName && (
                  <div className="text-sm text-brand-700 font-medium">👤 {o.guestName}</div>
                )}
                <div className="text-xs text-neutral-600">{o.id} {o.printed && "· 🖨 printed"}</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${COLOR[o.status]}`}>{o.status}</div>
            </div>

            <ul className="mt-3 divide-y">
              {o.items.map((it, i) => (
                <li key={i} className="py-1.5">
                  <div className="flex justify-between text-sm">
                    <span>
                      <b>{it.count}×</b> {it.name_en}{it.portion === "half" ? " (Half)" : ""}
                      <span className="text-xs text-neutral-500 ml-1">· {it.qty}</span>
                    </span>
                    <span className="text-neutral-600">{rupee(it.unitPrice * it.count)}</span>
                  </div>
                  {it.note && (
                    <div className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-0.5 mt-1 text-amber-900">
                      📝 {it.note}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {o.note && (
              <div className="mt-2 text-xs bg-amber-50 border border-amber-200 rounded p-2">📝 {o.note}</div>
            )}

            <div className="mt-3 flex justify-between items-end">
              <div className="text-xs text-neutral-600">
                Sub {rupee(o.subtotal)} · GST {rupee(o.cgst + o.sgst)}<br/>
                <span className="text-lg font-bold text-neutral-900">Total {rupee(o.total)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setPreview(o)}
                  className="text-xs bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 px-3 py-1 rounded">
                  🧾 GST bill
                </button>
                <button onClick={() => downloadKot(o)}
                  className="text-xs bg-neutral-800 hover:bg-black text-white px-3 py-1 rounded">
                  ⬇ ESC/POS
                </button>
                {NEXT[o.status] && (
                  <button onClick={() => advance(o)}
                    className="text-xs bg-forest-500 hover:bg-forest-700 text-white px-3 py-1 rounded font-bold">
                    → {NEXT[o.status]}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {preview && <BillModal o={preview} onClose={() => setPreview(null)} rupee={rupee} />}
      {showSales && sales && <SalesModal sales={sales} onClose={() => setShowSales(false)} rupee={rupee} />}
    </main>
  );
}

function BillModal({ o, onClose, rupee }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white text-neutral-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto print-area shadow-2xl">
        <div className="p-6 text-center border-b border-dashed">
          <div className="font-display text-2xl">{RESORT.name}</div>
          <div className="text-xs">{RESORT.address}</div>
          <div className="text-xs mt-1">GSTIN: {RESORT.gstin} · FSSAI: {RESORT.fssai}</div>
          <div className="text-xs">☎ {RESORT.phone}</div>
        </div>
        <div className="px-6 py-3 text-sm border-b border-dashed">
          <div className="flex justify-between">
            <div><b>Table:</b> {o.table}</div>
            <div><b>Bill:</b> {o.id}</div>
The file has been updated. Would you like me to also update the track page similarly? I'll now craft update for track page.