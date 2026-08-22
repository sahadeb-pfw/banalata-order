// Reception monitor — redirects to the live kitchen (KOT) dashboard.
// Guests never see this; they land on /menu?table=N via QR.
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/kitchen");
}
