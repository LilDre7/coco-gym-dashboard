"use client";

import { useState } from "react";
import { DashboardCheckInsCacheProvider } from "@/components/dashboard-checkins-cache-provider";
import { DashboardHeader } from "@/components/dashboard-header";
import { ExchangeRateBar } from "@/components/exchange-rate-bar";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <DashboardCheckInsCacheProvider>
      <div className="min-h-screen bg-muted/30">
        <ExchangeRateBar />
        <DashboardHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
        />
        <div
          className={cn(
            "transition-[padding-left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:pl-20",
            sidebarOpen && "md:pl-64"
          )}
        >
          <div className="w-full">{children}</div>
        </div>
      </div>
    </DashboardCheckInsCacheProvider>
  );
}
