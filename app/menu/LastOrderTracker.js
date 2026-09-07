"use client";
import { useEffect, useState } from "react";

// Shows a "Track your previous order" button whenever a recent order
// was placed on this browser. Reads the id saved in localStorage,
// confirms it still exists on the server, then opens /track/<id>.
export default function LastOrderTracker({ table }) {
  const [last, setLast] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bnl_last_order");
      if (!raw) { setLast(null); return; }
      const data = JSON.parse(raw);
      // only remember orders from the last 24 hours
      const recent = Date.now() - data.createdAt < 24 * 60 * 60 * 1000;
      if (recent && data.id) setLast(data);
    } catch (e) {
      /* ignore corrupted value */
    }
  }, [table]);

  async function goTrack() {
    if (!last) return;
    setChecking(true);
    try {
      const r = await fetch(`/api/orders/${last.id}`, { cache: "no-store" });
      if (!r.ok) {
        alert("Sorry — that order is no longer available on the server.");
        localStorage.removeItem("bnl_last_order");
        setLast(null);
        return;
      }
      window.location.href = `/track/${last.id}`;
    } catch (e) {
      console.error(e);
      alert("Network error — please try again.");
    } finally {
      setChecking(false);
    }
  }

  function forget() {
    localStorage.removeItem("bnl_last_order");
    setLast(null);
  }

  if (!last) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-20 flex justify-center px-4">
      <div className="bg-white border-2 border-brand-300 rounded-2xl shadow-lg px-3 py-2 flex items-center gap-2">
        <button
          onClick={goTrack}
          disabled={checking}
          className="bg-forest-500 hover:bg-forest-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          aria-label="Track your previous order"
        >
          {checking ? "Checking…" : `🔎 Track your previous order (${last.id})`}
        </button>
        <button
          onClick={forget}
          title="Forget this order"
          className="text-xs text-neutral-500 hover:text-neutral-700 underline"
        >
          Forget
        </button>
      </div>
    </div>
  );
}
