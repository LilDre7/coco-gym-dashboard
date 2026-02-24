"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/members", label: "Members", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

export function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border/60 bg-background md:flex md:flex-col">
        <div className="flex h-16 items-center gap-3 px-5">
          <Image
            src="/images/logo.png"
            alt="Coco Gym Fitness logo"
            width={34}
            height={34}
            className="rounded-full"
          />
          <span className="text-base font-semibold tracking-tight text-foreground">Coco Gym</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2" aria-label="Main navigation">
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
                className={cn(
                  "h-10 justify-start gap-2.5 rounded-lg px-3 text-sm font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  isActive && "bg-muted text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>
        <div className="p-3">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="h-10 w-full justify-start gap-2.5 rounded-lg px-3 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background md:hidden">
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
