"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LogOut,
  LayoutDashboard,
  Users,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/members", label: "Members", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

interface DashboardHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function DashboardHeader({ sidebarOpen, onToggleSidebar }: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-7 z-40 hidden border-r border-border/60 bg-background transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] md:flex md:flex-col",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="flex h-24 flex-col items-center justify-start gap-2 px-3 pb-2 pt-4">
          <div
            className={cn(
              "flex w-full items-center",
              sidebarOpen ? "justify-start gap-3" : "justify-center"
            )}
          >
            <Image
              src="/images/logo.png"
              alt="Coco Gym Fitness logo"
              width={34}
              height={34}
              className="rounded-full"
            />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap text-base font-semibold tracking-tight text-foreground transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                sidebarOpen ? "max-w-[140px] opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-1"
              )}
            >
              Coco Gym
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          className="absolute top-1/2 -right-3 z-20 h-8 w-8 -translate-y-1/2 rounded-full border border-border/80 bg-background text-foreground shadow-md transition-all duration-200 hover:bg-muted hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          {sidebarOpen ? (
            <ChevronsLeft className="h-4 w-4" />
          ) : (
            <ChevronsRight className="h-4 w-4" />
          )}
          <span className="sr-only">
            {sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          </span>
        </Button>
        <nav
          className={cn(
            "flex flex-1 flex-col gap-1 py-2 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            sidebarOpen ? "px-3" : "px-2"
          )}
          aria-label="Main navigation"
        >
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Button
                key={item.href}
                variant="ghost"
                onClick={() => router.push(item.href)}
                title={!sidebarOpen ? item.label : undefined}
                className={cn(
                  "h-10 rounded-lg text-sm font-normal text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted/60 hover:text-foreground",
                  sidebarOpen ? "justify-start gap-2.5 px-3" : "justify-center gap-0 px-0",
                  isActive && "bg-muted text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    sidebarOpen ? "max-w-[120px] opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-1"
                  )}
                >
                  {item.label}
                </span>
              </Button>
            );
          })}
        </nav>
        <div className={cn("space-y-2 p-3", !sidebarOpen && "px-2")}>
          <div className={cn("flex", sidebarOpen ? "justify-start" : "justify-center")}>
            <ThemeToggle vertical showLabels={sidebarOpen} />
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            title={!sidebarOpen ? "Sign out" : undefined}
            className={cn(
              "h-10 rounded-lg text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted/60 hover:text-foreground",
              sidebarOpen ? "w-full justify-start gap-2.5 px-3" : "w-full justify-center gap-0 px-0"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                sidebarOpen ? "max-w-[120px] opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-1"
              )}
            >
              Sign out
            </span>
          </Button>
        </div>
      </aside>

      <header className="sticky top-7 z-30 border-b border-border/60 bg-background md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/logo.png"
              alt="Coco Gym Fitness logo"
              width={30}
              height={30}
              className="rounded-full"
            />
            <span className="text-base font-semibold text-foreground">Coco Gym</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-4 pb-2">
          <ThemeToggle />
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto px-3 py-2" aria-label="Mobile navigation">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                onClick={() => router.push(item.href)}
                className={cn(
                  "gap-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  isActive && "bg-muted text-foreground"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </header>
    </>
  );
}
