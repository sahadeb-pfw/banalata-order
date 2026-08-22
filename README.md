# Banalata Order — QR Table Ordering System

Live, production-ready QR-code table-ordering workflow for **Banalata Hotel & Resort,
Joypur, Bankura**. Guest scans the QR on their table → 3-language menu (Bangla, Hindi,
English) opens on their phone → they place an order → the **reception / KOT monitor**
sees it instantly and prints a proper **GST invoice**.

## Routes

| URL | Audience |
|---|---|
| `/menu?table=N` | **Guest** — opens automatically after scanning the QR on table N (N = 1..50) |
| `/kitchen` | **Reception monitor** — live KOT board, GST bill preview + print, ESC/POS thermal-printer payload |
| `/admin` | **Manager** — generate & print 50 QR cards (one per table) |
| `/` | Redirects to `/kitchen` |

## Deploy to Vercel (1 click)

1. Push this repo to GitHub (see below).
2. Go to **https://vercel.com/new**, import the repo, click **Deploy**.
3. After the first deploy, open **Settings → Environment Variables** and add:
   - `NEXT_PUBLIC_BASE_URL` = your live URL (e.g. `https://banalata-order.vercel.app`)
   - *(optional)* `STAFF_USER` and `STAFF_PASS` — Basic Auth for `/kitchen` and `/admin`
4. **Redeploy** so `NEXT_PUBLIC_BASE_URL` is baked into the QR-card generator.
5. Open **`/admin`** on your live URL → click **Print cards** → stick QR 1..50 on tables.

## Local dev

```bash
npm install
npm run dev
# open http://localhost:3000/kitchen
```

## Real thermal printer (ESC/POS)

`/kitchen` exposes each order's raw ESC/POS bytes at `/api/print-queue` (base64).
Run this tiny Node bridge on the PC/Raspberry Pi that's physically connected to
your 58mm/80mm thermal printer:

```js
import escpos from "escpos";
import USB    from "escpos-usb";
const BASE = "https://banalata-order.vercel.app";

setInterval(async () => {
  const { jobs } = await fetch(BASE + "/api/print-queue").then(r => r.json());
  for (const j of jobs) {
    const device = new USB();
    device.open(() => {
      device.write(Buffer.from(j.payload, "base64"), () => {
        fetch(BASE + "/api/print-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: j.orderId }),
        });
      });
    });
  }
}, 1500);
```

Works with `node-thermal-printer`, `escpos-network` (LAN port 9100), and Bluetooth
receipt printers too.

## Editing GST / FSSAI / tax rates

Open `lib/menu.js` → `RESORT = { … }`. Change `gstin`, `fssai`, `cgstPct`, `sgstPct`,
`serviceChargePct`. Commit → Vercel auto-deploys.

## Menu

`lib/menu.js` → `ITEMS[]`. ~65 items curated from
`banalataresort.com/restaurant-cafe/`. Each item has `en/hi/bn` names, per-plate
quantities, full & half prices in INR.

## Storage

Orders live in memory (`lib/store.js`). They vanish on server restart / new deploy
— fine for the demo. For persistence, swap `db` for Postgres (Neon / Vercel
Postgres) or Redis. Store file is 60 lines; the swap is straightforward.

## License / attribution

Menu content © Banalata Hotel & Resort. This repo is a workflow implementation
for the resort's own use.
