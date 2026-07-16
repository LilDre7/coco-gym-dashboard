"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getCheckIns } from "@/lib/actions";
import {
  getCurrentMonthKey,
  getMonthKeyFromDateKey,
  type CheckIn,
} from "@/lib/checkins";

const CHECK_INS_CACHE_TTL_MS = 5 * 60 * 1000;

type DashboardCheckInsCacheState = {
  checkIns: CheckIn[];
  monthKey: string | null;
  fetchedAt: number | null;
  isLoading: boolean;
};

type DashboardCheckInsCacheContextValue = DashboardCheckInsCacheState & {
  ensureCheckIns: (
    monthKey: string,
    options?: { force?: boolean }
  ) => Promise<CheckIn[]>;
  setCachedCheckIns: (
    monthKey: string,
    value: React.SetStateAction<CheckIn[]>
  ) => void;
};

const DashboardCheckInsCacheContext =
  createContext<DashboardCheckInsCacheContextValue | null>(null);

function hasFreshCheckInsCache(
  state: DashboardCheckInsCacheState,
  monthKey: string
) {
  if (state.fetchedAt === null) return false;
  if (state.monthKey !== monthKey) return false;

  return Date.now() - state.fetchedAt < CHECK_INS_CACHE_TTL_MS;
}

export function DashboardCheckInsCacheProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<DashboardCheckInsCacheState>({
    checkIns: [],
    monthKey: null,
    fetchedAt: null,
    isLoading: false,
  });
  const stateRef = useRef(state);
  const inFlightRef = useRef<Promise<CheckIn[]> | null>(null);

  stateRef.current = state;

  const fetchAndStoreCheckIns = useCallback((monthKey: string) => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    setState((current) => ({
      ...current,
      isLoading: true,
    }));

    const request = getCheckIns(monthKey)
      .then((checkIns) => {
        setState({
          checkIns,
          monthKey,
          fetchedAt: Date.now(),
          isLoading: false,
        });
        return checkIns;
      })
      .catch((error) => {
        setState((current) => ({
          ...current,
          isLoading: false,
        }));
        throw error;
      })
      .finally(() => {
        inFlightRef.current = null;
      });

    inFlightRef.current = request;
    return request;
  }, []);

  const ensureCheckIns = useCallback(
    async (monthKey: string, options?: { force?: boolean }) => {
      const force = options?.force ?? false;
      const current = stateRef.current;

      if (!force && hasFreshCheckInsCache(current, monthKey)) {
        return current.checkIns;
      }

      if (!force && current.checkIns.length > 0 && current.monthKey === monthKey) {
        if (!inFlightRef.current) {
          void fetchAndStoreCheckIns(monthKey).catch((error) => {
            console.error("Failed to refresh dashboard check-ins cache:", error);
          });
        }

        return current.checkIns;
      }

      return fetchAndStoreCheckIns(monthKey);
    },
    [fetchAndStoreCheckIns]
  );

  const setCachedCheckIns = useCallback(
    (monthKey: string, value: React.SetStateAction<CheckIn[]>) => {
      setState((current) => ({
        checkIns:
          typeof value === "function"
            ? value(current.checkIns)
            : value,
        monthKey,
        fetchedAt: Date.now(),
        isLoading: false,
      }));
    },
    []
  );

  useEffect(() => {
    void ensureCheckIns(getCurrentMonthKey()).catch((error) => {
      console.error("Failed to prime dashboard check-ins cache:", error);
    });
  }, [ensureCheckIns]);

  const value = useMemo(
    () => ({
      ...state,
      ensureCheckIns,
      setCachedCheckIns,
    }),
    [ensureCheckIns, setCachedCheckIns, state]
  );

  return (
    <DashboardCheckInsCacheContext.Provider value={value}>
      {children}
    </DashboardCheckInsCacheContext.Provider>
  );
}

export function useDashboardCheckInsCache() {
  const context = useContext(DashboardCheckInsCacheContext);

  if (!context) {
    throw new Error(
      "useDashboardCheckInsCache must be used within DashboardCheckInsCacheProvider"
    );
  }

  return context;
}
