"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Coffee,
  FolderTree,
  Users,
  BarChart3,
  TrendingUp,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/menu", label: "Menu", icon: Coffee },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/sales", label: "Sales", icon: BarChart3 },
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

// Shown on the compact bottom nav (mobile) — the highest-traffic items only.
const MOBILE_NAV_ITEMS = NAV_ITEMS.slice(0, 4);

export function AdminShell({
  adminName,
  children,
}: {
  adminName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-light/40 md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-ink/10 px-4 py-6">
        <p className="font-headline font-bold text-brand-dark px-2 mb-6">O, How? Admin</p>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                pathname.startsWith(href)
                  ? "bg-brand text-cream"
                  : "text-ink hover:bg-brand-light"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-2 text-xs text-ink-muted mb-2 truncate">{adminName}</div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-brand-light"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </aside>

      <div className="flex-1 md:ml-60">
        <main className="pb-20 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-ink/10 flex justify-around py-2 z-20">
        {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${
              pathname.startsWith(href) ? "text-brand" : "text-ink-muted"
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
