"use client";
import { useEffect, useState } from "react";
import { RESORT } from "../../lib/menu.js";

const STATUSES = ["NEW", "PREPARING", "READY", "SERVED"];
const NEXT = { NEW: "PREPARING", PREPARING: "READY", READY: "SERVED" };
const COLOR = {
  NEW:       "bg-red-100 border-red-400 text-red-900",
  PREPARING: "bg-amber-100 border-amber-400 text-amber-900",
  READY:     "bg-green-100 border-green-500 text-green-900",
  SERVED:    "bg-neutral-100 border-neutral-300 text-neutral-500",
};

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [ding,   setDing]   = useState(0);
  const [preview, setPreview] = useState(null);
  const rupee = (n) => "₹" + n.toLocaleString("en-IN");

  async function refresh() {
    const r = await fetch("/api/orders", { cache: "no-store" });
    const j = await r.json();
    setOrders(prev => {
      if (j.orders.length > prev.length) setDing(d => d + 1);
      return j.orders;
    });
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
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
    // fetch ESC/POS bytes so operator can save/pipe to thermal printer
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
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3">
          <div>
            <h1 className="font-display text-2xl text-amber-200">Banalata KOT · Kitchen Screen</h1>
            <p className="text-xs text-neutral-400">Live orders • auto refresh every 2 s • ding: {ding}</p>
          </div>
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
            No orders yet. Open the <a href="/menu?table=42" className="underline text-amber-300">guest menu</a> and place one.
          </div>
        )}

        {orders.map(o => (
          <div key={o.id} className={`border-l-8 ${COLOR[o.status]} bg-white text-neutral-900 rounded-lg shadow p-4`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs text-neutral-500">{new Date(o.createdAt).toLocaleTimeString("en-IN")}</div>
                <div className="text-2xl font-bold">Table #{o.table}</div>
                <div className="text-xs text-neutral-600">{o.id} {o.printed && "· 🖨 printed"}</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${COLOR[o.status]}`}>{o.status}</div>
            </div>

            <ul className="mt-3 divide-y">
              {o.items.map((it, i) => (
                <li key={i} className="py-1 flex justify-between text-sm">
                  <span>
                    <b>{it.count}×</b> {it.name_en}{it.portion === "half" ? " (Half)" : ""}
                    <span className="text-xs text-neutral-500 ml-1">· {it.qty}</span>
                  </span>
                  <span className="text-neutral-600">{rupee(it.unitPrice * it.count)}</span>
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
                    className="text-xs bg-forest-500 hover:bg-forest-700 text-white px-3 py-1 rounded">
                    → {NEXT[o.status]}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {preview && <BillModal o={preview} onClose={() => setPreview(null)} rupee={rupee} />}
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
        <div className="px-6 py-3 flex justify-between text-sm border-b border-dashed">
          <div><b>Table:</b> {o.table}</div>
          <div><b>Bill:</b> {o.id}</div>
          <div>{new Date(o.createdAt).toLocaleString("en-IN")}</div>
        </div>
        <table className="w-full text-sm px-6 py-3">
          <thead className="border-b">
            <tr className="text-left"><th className="p-2">Item</th><th>Qty</th><th className="text-right p-2">Amt</th></tr>
          </thead>
          <tbody>
            {o.items.map((it, i) => (
              <tr key={i} className="border-b border-dotted">
                <td className="p-2">
                  {it.name_en}{it.portion === "half" ? " (H)" : ""}
                  <div className="text-[10px] text-neutral-500">{it.qty}</div>
                </td>
                <td>{it.count}</td>
                <td className="text-right p-2">{rupee(it.unitPrice * it.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 pb-4 text-sm">
          <Row l="Subtotal" v={rupee(o.subtotal)} />
          <Row l={`CGST ${RESORT.cgstPct}%`} v={rupee(o.cgst)} />
          <Row l={`SGST ${RESORT.sgstPct}%`} v={rupee(o.sgst)} />
          <div className="border-t border-dashed mt-2 pt-2 flex justify-between font-bold text-lg">
            <span>TOTAL</span><span>{rupee(o.total)}</span>
          </div>
          <p className="text-center text-xs mt-4 italic">Thank you • আবার আসবেন • फिर पधारें</p>
        </div>
        <div className="p-3 border-t flex justify-end gap-2 no-print">
          <button onClick={() => window.print()} className="bg-brand-700 text-white px-4 py-1.5 rounded">🖨 Print</button>
          <button onClick={onClose} className="bg-neutral-200 px-4 py-1.5 rounded">Close</button>
        </div>
      </div>
    </div>
  );
}

function Row({ l, v }) {
  return <div className="flex justify-between py-0.5"><span>{l}</span><span>{v}</span></div>;
}
