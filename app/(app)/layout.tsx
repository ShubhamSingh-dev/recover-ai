"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CreditCard, Users, RefreshCw, BarChart2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Payments", href: "/payments", icon: CreditCard },
  { label: "Customers", href: "/customers/demo", icon: Users },
  { label: "Recovery", href: "/recovery", icon: RefreshCw },
  { label: "Evaluation", href: "/evaluation", icon: BarChart2 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-bg-canvas text-text-primary">
      {/* Tier 1: Dark Icon Rail */}
      <aside className="w-16 bg-bg-inverse flex flex-col items-center py-5 justify-between border-r border-border-default/10 shrink-0">
        <div className="flex flex-col items-center gap-6">
          <Link href="/dashboard" className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-white">
            <ShieldCheck className="h-6 w-6" />
          </Link>
        </div>
      </aside>

      {/* Tier 2: Light Nav Panel */}
      <aside className="w-60 bg-bg-surface border-r border-border-default flex flex-col shrink-0">
        {/* User Header */}
        <div className="p-4 border-b border-border-default flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-bg-sunken flex items-center justify-center font-semibold text-xs text-text-primary">
            M
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary truncate">Merchant Admin</p>
            <p className="text-xs text-text-muted truncate">ops@recoverai.dev</p>
          </div>
        </div>

        {/* Nav list */}
        <nav className="p-3 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-text-secondary hover:bg-bg-sunken hover:text-text-primary"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
