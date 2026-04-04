"use client";

import { useCallback, useEffect } from "react";
import { CheckInsDashboard } from "@/components/checkins-dashboard";
import { useDashboardCheckInsCache } from "@/components/dashboard-checkins-cache-provider";
import { type CheckIn } from "@/lib/checkins";
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
    void ensureCheckIns(initialDateKey).catch((error) => {
      console.error("Failed to load dashboard check-ins:", error);
    });
  }, [ensureCheckIns, initialDateKey]);

  const handleSetCheckIns = useCallback(
    (value: React.SetStateAction<CheckIn[]>) => {
      setCachedCheckIns(initialDateKey, value);
    },
    [initialDateKey, setCachedCheckIns]
  );

  return (
    <CheckInsDashboard
      checkIns={checkIns}
      setCheckIns={handleSetCheckIns}
      initialProducts={initialProducts}
      initialMembers={initialMembers}
      initialDateKey={initialDateKey}
      initialTime={initialTime}
    />
  );
}
