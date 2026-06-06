import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, MapPin, ListChecks, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLocalState, K } from "@/lib/storage";
import type { HomeLocation, SavedStore } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bag Au Pair" },
      { name: "description", content: "Never forget your reusable bags again." },
    ],
  }),
  component: Home,
});

function Home() {
  const [home] = useLocalState<HomeLocation | null>(K.home, null);
  const [stores] = useLocalState<SavedStore[]>(K.stores, []);

  const ready = !!home && stores.length > 0;

  return (
    <AppShell>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Never forget your bags again
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Eco-friendly reminders for a greener you 🌿
      </p>

      <section className="mt-6 rounded-3xl bg-gradient-hero p-5 text-primary-foreground shadow-hero">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="text-xs/5 opacity-80">Status</div>
            <div className="text-xl font-semibold">
              {ready ? "All set — we'll remind you" : "Bags ready to go!"}
            </div>
            <div className="text-xs opacity-90">
              {ready
                ? `${stores.length} store${stores.length === 1 ? "" : "s"} watched · home set`
                : "Set up store alerts to get started"}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed opacity-90">
          When you go to this app press the <b>Install</b> button to add it to your
          home screen just like a native app. Totally secure — your personal data
          stays on this device, never sold.
        </p>
      </section>

      <h2 className="mt-8 text-lg font-semibold">Quick Actions</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <QuickAction
          to="/stores"
          icon={<MapPin className="h-5 w-5" />}
          tone="primary"
          title="Find Stores"
          subtitle="Nearby grocery stores"
        />
        <QuickAction
          to="/list"
          icon={<ListChecks className="h-5 w-5" />}
          tone="amber"
          title="Shopping List"
          subtitle="Manage your items"
        />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Eco Tips</h2>
      <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-soft/20 text-amber-soft">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Wash your canvas bags</div>
            <p className="text-sm text-muted-foreground">
              Clean your reusable bags every couple weeks to keep them fresh and
              hygienic. We'll remind you! 🧼
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function QuickAction({
  to,
  icon,
  title,
  subtitle,
  tone,
}: {
  to: "/stores" | "/list";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: "primary" | "amber";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/15 text-primary"
      : "bg-amber-soft/20 text-amber-soft";
  return (
    <Link
      to={to}
      className="rounded-2xl border border-border bg-card p-4 shadow-card transition-transform hover:-translate-y-0.5"
    >
      <div className={"grid h-10 w-10 place-items-center rounded-xl " + toneClass}>
        {icon}
      </div>
      <div className="mt-3 font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </Link>
  );
}
