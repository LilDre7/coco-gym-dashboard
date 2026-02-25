"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Users, BarChart3, PanelLeft } from "lucide-react";
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
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleSidebar}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className={cn(
              "text-muted-foreground transition-colors hover:text-foreground",
              sidebarOpen ? "self-start" : "self-center"
            )}
          >
            <PanelLeft
              className={cn(
                "h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                !sidebarOpen && "rotate-180"
              )}
            />
          </Button>
        </div>
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
        <div className={cn("p-3", !sidebarOpen && "px-2")}>
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
