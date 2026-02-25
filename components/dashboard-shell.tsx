"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-muted/30">
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
  );
}
