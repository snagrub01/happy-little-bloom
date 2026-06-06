import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/donate")({
  head: () => ({
    meta: [
      { title: "Donate · Bag Au Pair" },
      { name: "description", content: "Support Bag Au Pair — a free, privacy-first eco reminder app." },
    ],
  }),
  component: DonatePage,
});

function DonatePage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Support Bag Au Pair</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This app is free and your data never leaves your device. If it saves you
        some plastic bags — and a few trips back to the car — consider chipping in.
      </p>

      <div className="mt-6 rounded-3xl bg-gradient-hero p-6 text-primary-foreground shadow-hero">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
          <Heart className="h-6 w-6" />
        </div>
        <div className="mt-3 text-xl font-semibold">Every dollar helps</div>
        <p className="mt-1 text-sm opacity-90">
          Donations cover hosting + map credits so the app stays ad-free.
        </p>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); alert("Connect a donation provider (Stripe, PayPal, Buy Me a Coffee) here."); }}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary"
        >
          Donate
        </a>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Want me to wire up a real donation link? Tell me which provider you use
        (Stripe, PayPal, Ko-fi, Buy Me a Coffee) and I'll connect it.
      </p>
    </AppShell>
  );
}
