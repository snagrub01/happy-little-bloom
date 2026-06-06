import { Link, useRouterState } from "@tanstack/react-router";
import { Home, MapPin, ListChecks, Bell, Heart, Download } from "lucide-react";
import { useEffect, type ComponentType, type ReactNode } from "react";
import logo from "@/assets/bag-logo.png";
import { ensureNotificationPermission } from "@/lib/notifications";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/stores", label: "Stores", icon: MapPin },
  { to: "/list", label: "List", icon: ListChecks },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/donate", label: "Donate", icon: Heart },
  { to: "/install", label: "Install", icon: Download },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));

    if (!standalone) return;
    if (window.sessionStorage.getItem("bap.notificationsPrompted") === "1") return;

    window.sessionStorage.setItem("bap.notificationsPrompted", "1");
    void ensureNotificationPermission();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="mx-auto w-full max-w-md px-5 pt-6">
        <div className="flex items-center gap-2 text-primary">
          <img src={logo} alt="" width={32} height={32} className="h-8 w-8" />
          <span className="text-sm font-semibold tracking-wider uppercase">
            Bag Au Pair
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-28 pt-4">
        {children}
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-bottom"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 py-1.5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className={
                    "flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors " +
                    (active
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
