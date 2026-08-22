"use client";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { RESORT } from "../../lib/menu.js";

export default function Admin() {
  const [from, setFrom]   = useState(1);
  const [to,   setTo]     = useState(50);
  const [base, setBase]   = useState("");
  const [pngs, setPngs]   = useState({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Prefer the env-configured public URL so printed QR cards always work
      // even if this dashboard is opened via a preview/tunnel URL.
      const envBase = process.env.NEXT_PUBLIC_BASE_URL;
      setBase(envBase && envBase.startsWith("http") ? envBase.replace(/\/$/, "") : window.location.origin);
    }
  }, []);

  const nums = useMemo(() => {
    const a = [];
    for (let i = Math.max(1, from); i <= Math.min(RESORT.totalTables, to); i++) a.push(i);
    return a;
  }, [from, to]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out = {};
      for (const n of nums) {
        const url = `${base}/menu?table=${n}`;
        out[n] = await QRCode.toDataURL(url, { margin: 1, width: 256, color: { dark: "#3a2609", light: "#fdf7ef" }});
        if (cancelled) return;
      }
      if (!cancelled) setPngs(out);
    })();
    return () => { cancelled = true; };
  }, [nums, base]);

  return (
    <main className="parchment min-h-screen">
      <header className="bg-brand-800 text-brand-50 no-print">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="font-display text-2xl">Admin · Table QR Cards</h1>
          <a href="/" className="text-sm underline">← back</a>
        </div>
      </header>

      <section className="max-w-6xl mx-auto p-6 no-print">
        <div className="bg-white border border-brand-200 rounded-xl p-4 grid md:grid-cols-4 gap-4 items-end">
          <label className="text-sm">
            <div className="text-brand-700">From table</div>
            <input type="number" min={1} max={RESORT.totalTables} value={from}
              onChange={e => setFrom(Number(e.target.value))}
              className="mt-1 w-full border border-brand-300 rounded p-2" />
          </label>
          <label className="text-sm">
            <div className="text-brand-700">To table (max {RESORT.totalTables})</div>
            <input type="number" min={1} max={RESORT.totalTables} value={to}
              onChange={e => setTo(Number(e.target.value))}
              className="mt-1 w-full border border-brand-300 rounded p-2" />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="text-brand-700">QR encodes URL</div>
            <input value={`${base}/menu?table=<N>`} readOnly
              className="mt-1 w-full border border-brand-300 rounded p-2 bg-brand-50 text-brand-700 text-xs" />
          </label>
        </div>

        <div className="mt-4 flex justify-between">
          <p className="text-brand-700 text-sm">
            Rendering <b>{nums.length}</b> cards. Adjust the range and click <b>Print</b> — each card is A6 landscape,
            stick one on every table.
          </p>
          <button onClick={() => window.print()}
            className="bg-brand-700 hover:bg-brand-800 text-brand-50 px-5 py-2 rounded-lg">
            🖨 Print cards
          </button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print-area">
        {nums.map(n => (
          <div key={n}
            className="bg-white border-2 border-brand-300 rounded-2xl p-3 text-center shadow-sm break-inside-avoid">
            <div className="tracking-[0.35em] text-[8px] text-brand-500">JOYPUR • BANKURA</div>
            <div className="font-display text-lg text-brand-800 leading-tight">Banalata</div>
            <div className="text-[10px] text-brand-600">Hotel &amp; Resort</div>
            <div className="gold-line w-16 mx-auto my-1.5" />
            {pngs[n] ? (
              <img src={pngs[n]} alt={`table ${n}`} className="w-full aspect-square" />
            ) : (
              <div className="w-full aspect-square bg-brand-100 animate-pulse" />
            )}
            <div className="mt-1 text-brand-700 text-xs">Scan for menu</div>
            <div className="font-display text-2xl text-brand-800 mt-0.5">Table {n}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
