"use client";

import { useEffect } from "react";
import { CheckInsDashboard } from "@/components/checkins-dashboard";
import { useDashboardCheckInsCache } from "@/components/dashboard-checkins-cache-provider";
import { getMonthKeyFromDateKey } from "@/lib/checkins";
import { type MemberWithStatus, type StoreProductRow } from "@/lib/types";

interface CheckInsDashboardRouteProps {
  initialProducts: StoreProductRow[];
  initialMembers: MemberWithStatus[];
  initialDateKey: string;
  initialTime: string;
}

export function CheckInsDashboardRoute({
  initialProducts,
  initialMembers,
  initialDateKey,
  initialTime,
}: CheckInsDashboardRouteProps) {
  const { checkIns, ensureCheckIns, setCachedCheckIns } =
    useDashboardCheckInsCache();

  useEffect(() => {
    const monthKey = getMonthKeyFromDateKey(initialDateKey);
    void ensureCheckIns(monthKey).catch((error) => {
      console.error("Failed to load dashboard check-ins:", error);
    });
  }, [ensureCheckIns, initialDateKey]);

  return (
    <CheckInsDashboard
      checkIns={checkIns}
      setCachedCheckIns={setCachedCheckIns}
      ensureCheckIns={ensureCheckIns}
      initialProducts={initialProducts}
      initialMembers={initialMembers}
      initialDateKey={initialDateKey}
      initialTime={initialTime}
    />
  );
}
