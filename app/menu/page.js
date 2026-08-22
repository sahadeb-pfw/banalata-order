"use client";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, ITEMS, RESORT } from "../../lib/menu.js";

export default function MenuPage({ searchParams }) {
  const tableParam = Number(searchParams?.table);
  if (!tableParam || tableParam < 1 || tableParam > RESORT.totalTables) {
    return (
      <main className="parchment min-h-screen flex items-center justify-center p-6">
        <div className="bg-white border border-brand-200 rounded-2xl p-8 max-w-md text-center shadow">
          <div className="text-5xl mb-3">📱</div>
          <h1 className="font-display text-2xl text-brand-800">Please scan the QR on your table</h1>
          <p className="text-brand-700 text-sm mt-2">
            The menu opens automatically when you scan the QR code stuck on your table at
            Banalata Hotel &amp; Resort, Joypur.
          </p>
        </div>
      </main>
    );
  }
  const table = tableParam;

  const [lang, setLang] = useState("en");                 // en | hi | bn
  const [cat,  setCat]  = useState(CATEGORIES[0].id);
  const [cart, setCart] = useState({});                   // key = id|portion -> {count}
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced]   = useState(null);

  const rupee = (n) => "₹" + n.toLocaleString("en-IN");

  const items = useMemo(() => ITEMS.filter(i => i.cat === cat), [cat]);

  const add = (item, portion) => {
    const price = portion === "half" ? item.half : item.price;
    const key = `${item.id}|${portion}`;
    setCart(c => ({ ...c, [key]: { item, portion, price, count: (c[key]?.count || 0) + 1 } }));
  };
  const sub = (key) => {
    setCart(c => {
      const cur = c[key];
      if (!cur) return c;
      const nx = { ...c };
      if (cur.count <= 1) delete nx[key];
      else nx[key] = { ...cur, count: cur.count - 1 };
      return nx;
    });
  };

  const lines   = Object.entries(cart);
  const subtotal = lines.reduce((s, [, v]) => s + v.price * v.count, 0);
  const cgst = +(subtotal * RESORT.cgstPct / 100).toFixed(2);
  const sgst = +(subtotal * RESORT.sgstPct / 100).toFixed(2);
  const total = Math.round(subtotal + cgst + sgst);

  async function placeOrder() {
    if (!lines.length) return;
    setPlacing(true);
    const payload = {
      table,
      note,
      items: lines.map(([k, v]) => ({
        id: v.item.id,
        name_en: v.item.en.name,
        qty: v.item[lang].qty,
        unitPrice: v.price,
        count: v.count,
        portion: v.portion,
      })),
    };
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setPlacing(false);
    setPlaced(data.order);
    setCart({});
    setNote("");
  }

  // ---------- placed confirmation screen ----------
  if (placed) {
    return (
      <main className="parchment min-h-screen">
        <div className="max-w-xl mx-auto p-6">
          <div className="bg-white rounded-2xl border border-brand-200 shadow-lg p-8 text-center">
            <div className="text-5xl">✅</div>
            <h1 className="font-display text-3xl text-brand-800 mt-3">Order placed!</h1>
            <p className="text-brand-700 mt-1">Table <b>{placed.table}</b> · {placed.id}</p>
            <div className="gold-line w-40 mx-auto my-4" />
            <p className="text-sm text-brand-700">
              Your GST bill is printing at the counter. A steward will bring your food in
              <b> 5–6 minutes</b>.
            </p>
            <div className="mt-4 text-left text-sm border-t border-brand-100 pt-3">
              {placed.items.map((it, i) => (
                <div key={i} className="flex justify-between py-0.5">
                  <span>{it.name_en}{it.portion === "half" ? " (Half)" : ""} × {it.count}</span>
                  <span>{rupee(it.unitPrice * it.count)}</span>
                </div>
              ))}
              <div className="flex justify-between mt-2 pt-2 border-t border-dashed">
                <span>Subtotal</span><span>{rupee(placed.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-brand-600">
                <span>CGST {RESORT.cgstPct}% + SGST {RESORT.sgstPct}%</span>
                <span>{rupee(placed.cgst + placed.sgst)}</span>
              </div>
              <div className="flex justify-between mt-2 font-bold text-lg text-brand-800">
                <span>TOTAL</span><span>{rupee(placed.total)}</span>
              </div>
            </div>
            <button
              onClick={() => setPlaced(null)}
              className="mt-6 bg-brand-700 hover:bg-brand-800 text-brand-50 px-5 py-2 rounded-lg"
            >Order more</button>
          </div>
        </div>
      </main>
    );
  }

  // ---------- main menu screen ----------
  return (
    <main className="parchment min-h-screen pb-40">
      {/* header */}
      <header className="bg-gradient-to-b from-brand-800 to-brand-700 text-brand-50 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-5 text-center">
          <p className="tracking-[0.4em] text-brand-200 text-[10px]">JOYPUR FOREST • SINCE 1998</p>
          <h1 className="font-display text-3xl md:text-4xl">Banalata Hotel &amp; Resort</h1>
          <div className="gold-line w-40 mx-auto my-2" />
          <p className="text-xs text-brand-100">
            Table <span className="bg-brand-50 text-brand-800 font-bold px-2 py-0.5 rounded ml-1">#{table}</span>
            &nbsp;·&nbsp; GSTIN {RESORT.gstin} &nbsp;·&nbsp; FSSAI {RESORT.fssai}
          </p>
          {/* language switcher */}
          <div className="inline-flex bg-brand-900/40 rounded-full mt-4 p-1 text-sm">
            {[
              { k: "en", label: "English" },
              { k: "hi", label: "हिन्दी" },
              { k: "bn", label: "বাংলা" },
            ].map(l => (
              <button key={l.k}
                onClick={() => setLang(l.k)}
                className={`px-4 py-1 rounded-full transition ${
                  lang === l.k ? "bg-brand-50 text-brand-800 font-semibold" : "text-brand-100"
                }`}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* category tabs */}
      <nav className="sticky top-0 bg-brand-50/95 backdrop-blur z-20 border-b border-brand-200">
        <div className="max-w-5xl mx-auto flex overflow-x-auto gap-2 px-3 py-2 no-scrollbar">
          {CATEGORIES.map(c => (
            <button key={c.id}
              onClick={() => setCat(c.id)}
              className={`whitespace-nowrap px-3 py-1.5 text-sm rounded-full border ${
                cat === c.id
                  ? "bg-brand-700 text-brand-50 border-brand-700"
                  : "bg-white text-brand-800 border-brand-200 hover:border-brand-400"
              }`}>
              {c[lang]}
            </button>
          ))}
        </div>
      </nav>

      {/* menu items */}
      <section className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="font-display text-2xl text-brand-800 text-center">
          {CATEGORIES.find(c => c.id === cat)[lang]}
        </h2>
        <div className="gold-line w-32 mx-auto my-3" />

        {/* three-column header (desktop) */}
        <div className="hidden md:grid grid-cols-[1.2fr_1.2fr_1.2fr_auto_auto] gap-3 text-xs uppercase tracking-wider text-brand-600 border-b border-brand-200 pb-2 mb-2">
          <div>English</div>
          <div>हिन्दी</div>
          <div className="font-bangla">বাংলা</div>
          <div className="text-right">Price</div>
          <div></div>
        </div>

        <ul className="divide-y divide-brand-100">
          {items.map(it => (
            <li key={it.id} className="py-4">
              <div className="md:grid md:grid-cols-[1.2fr_1.2fr_1.2fr_auto_auto] md:gap-3 md:items-center">
                <NameCell name={it.en.name} qty={it.en.qty} />
                <NameCell name={it.hi.name} qty={it.hi.qty} />
                <NameCell name={it.bn.name} qty={it.bn.qty} font="font-bangla" />
                <div className="mt-2 md:mt-0 md:text-right">
                  <div className="font-semibold text-brand-800">{rupee(it.price)}</div>
                  {it.half && (
                    <div className="text-xs text-brand-600">Half {rupee(it.half)}</div>
                  )}
                </div>
                <div className="mt-2 md:mt-0 flex md:flex-col gap-2 md:items-end">
                  <button onClick={() => add(it, "full")}
                    className="bg-brand-700 hover:bg-brand-800 text-brand-50 text-xs px-3 py-1.5 rounded-md">
                    + Full
                  </button>
                  {it.half && (
                    <button onClick={() => add(it, "half")}
                      className="bg-white border border-brand-400 text-brand-800 text-xs px-3 py-1.5 rounded-md hover:bg-brand-50">
                      + Half
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* floating cart */}
      <FloatingCart
        lines={lines}
        subtotal={subtotal}
        cgst={cgst} sgst={sgst} total={total}
        rupee={rupee}
        sub={sub}
        note={note} setNote={setNote}
        placing={placing}
        onPlace={placeOrder}
        table={table}
        lang={lang}
      />
    </main>
  );
}

function NameCell({ name, qty, font = "" }) {
  return (
    <div className={font}>
      <div className="font-medium text-brand-900">{name}</div>
      <div className="text-xs text-brand-600">{qty}</div>
    </div>
  );
}

function FloatingCart({ lines, subtotal, cgst, sgst, total, rupee, sub, note, setNote, placing, onPlace, table, lang }) {
  const [open, setOpen] = useState(false);
  const count = lines.reduce((s, [, v]) => s + v.count, 0);

  const labels = {
    en: { review: "Review order", table: "Table", place: "Place order",
          empty: "No items yet — pick something from the menu.",
          note: "Note for kitchen (allergies, spice level)…",
          sub: "Subtotal", tax: "CGST + SGST", tot: "Total incl. GST" },
    hi: { review: "ऑर्डर देखें", table: "टेबल", place: "ऑर्डर दें",
          empty: "अभी कुछ नहीं — मेनू से चुनें।",
          note: "किचन के लिए नोट (एलर्जी, तीखापन)…",
          sub: "सबटोटल", tax: "CGST + SGST", tot: "कुल (GST सहित)" },
    bn: { review: "অর্ডার দেখুন", table: "টেবিল", place: "অর্ডার করুন",
          empty: "কিছু বেছে নিন মেনু থেকে।",
          note: "রান্নাঘরের জন্য নোট (অ্যালার্জি, ঝাল)…",
          sub: "সাবটোটাল", tax: "CGST + SGST", tot: "মোট (GST সহ)" },
  }[lang];

  return (
    <div className="fixed inset-x-0 bottom-0 z-30">
      {/* bar */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full bg-brand-800 text-brand-50 py-3 flex justify-between items-center px-6 shadow-xl">
        <span className="font-medium">
          🛒 {count} item{count === 1 ? "" : "s"} · {labels.table} #{table}
        </span>
        <span className="font-bold text-lg">{rupee(total)}</span>
        <span className="text-brand-200 text-sm">{open ? "▼" : "▲"} {labels.review}</span>
      </button>

      {/* panel */}
      {open && (
        <div className="bg-white border-t border-brand-200 max-h-[65vh] overflow-y-auto p-4 md:p-6">
          {lines.length === 0 ? (
            <p className="text-center text-brand-600 py-6">{labels.empty}</p>
          ) : (
            <div className="max-w-3xl mx-auto">
              <ul className="divide-y divide-brand-100">
                {lines.map(([key, v]) => (
                  <li key={key} className="py-2 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium">
                        {v.item[lang].name}
                        {v.portion === "half" && <span className="ml-2 text-xs text-brand-600">(Half)</span>}
                      </div>
                      <div className="text-xs text-brand-600">{v.item[lang].qty} · {rupee(v.price)} × {v.count}</div>
                    </div>
                    <button onClick={() => sub(key)}
                      className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 font-bold">−</button>
                    <div className="w-6 text-center">{v.count}</div>
                    <div className="w-20 text-right font-semibold">{rupee(v.price * v.count)}</div>
                  </li>
                ))}
              </ul>

              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={labels.note}
                className="mt-4 w-full border border-brand-200 rounded-lg p-2 text-sm bg-brand-50/40"
                rows={2}
              />

              <div className="mt-4 border-t border-brand-100 pt-3 text-sm">
                <Row l={labels.sub} v={rupee(subtotal)} />
                <Row l={labels.tax} v={rupee(cgst + sgst)} small />
                <Row l={labels.tot} v={rupee(total)} bold />
              </div>

              <button
                disabled={placing}
                onClick={onPlace}
                className="mt-4 w-full bg-forest-500 hover:bg-forest-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
                {placing ? "…" : `${labels.place} · ${rupee(total)}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ l, v, small, bold }) {
  return (
    <div className={`flex justify-between ${small ? "text-xs text-brand-600" : ""} ${bold ? "font-bold text-brand-800 text-lg mt-1" : ""}`}>
      <span>{l}</span><span>{v}</span>
    </div>
  );
}
