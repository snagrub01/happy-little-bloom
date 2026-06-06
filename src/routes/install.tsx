import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Share, Plus, Smartphone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  ensureNotificationPermission,
  requestNotificationPermissionFromUserGesture,
} from "@/lib/notifications";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "Install · Bag Au Pair" },
      { name: "description", content: "Install Bag Au Pair to your home screen." },
    ],
  }),
  component: InstallPage,
});

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function InstallPage() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() { setInstalled(true); setDeferred(null); }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const isIOS = typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  async function install() {
    if (!deferred) return;
    const permissionPromise = requestNotificationPermissionFromUserGesture();
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      await permissionPromise;
      await ensureNotificationPermission();
      localStorage.setItem("bap.reminders", JSON.stringify({
        enabled: true,
        secondaryDelayMin: 2,
        couponDelayMin: 6,
        washWeeks: 2,
      }));
    }
    setDeferred(null);
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Install the app</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add Bag Au Pair to your home screen for a full-screen, native-like experience.
      </p>

      {installed ? (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-primary">
          ✓ Installed! Open Bag Au Pair from your home screen.
        </div>
      ) : deferred ? (
        <button
          onClick={install}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-hero px-4 py-3 font-semibold text-primary-foreground shadow-hero"
        >
          <Download className="h-5 w-5" /> Install Bag Au Pair
        </button>
      ) : isIOS ? (
        <div className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 font-semibold">
            <Smartphone className="h-5 w-5 text-primary" /> Install on iPhone
          </div>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. Tap the <Share className="inline h-4 w-4" /> Share button in Safari.</li>
            <li>2. Scroll and choose <b>Add to Home Screen</b> <Plus className="inline h-4 w-4" />.</li>
            <li>3. Tap <b>Add</b> — done!</li>
          </ol>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
          Your browser hasn't offered an install prompt yet. Use it for a minute, or
          open the browser menu and choose <b>Install app</b> / <b>Add to Home Screen</b>.
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Why install
      </h2>
      <ul className="mt-2 space-y-2 text-sm">
        <li className="rounded-xl border border-border bg-card p-3 shadow-card">
          📍 Faster access — opens like any other app
        </li>
        <li className="rounded-xl border border-border bg-card p-3 shadow-card">
          🔒 Your data stays on your device
        </li>
        <li className="rounded-xl border border-border bg-card p-3 shadow-card">
          🌿 Works offline for shopping list & settings
        </li>
      </ul>
    </AppShell>
  );
}
