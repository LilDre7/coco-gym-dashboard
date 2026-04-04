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
import { formatLocalDateKey, type CheckIn } from "@/lib/checkins";

const CHECK_INS_CACHE_TTL_MS = 5 * 60 * 1000;

type DashboardCheckInsCacheState = {
  checkIns: CheckIn[];
  dateKey: string | null;
  fetchedAt: number | null;
  isLoading: boolean;
};

type DashboardCheckInsCacheContextValue = DashboardCheckInsCacheState & {
  ensureCheckIns: (
    dateKey: string,
    options?: { force?: boolean }
  ) => Promise<CheckIn[]>;
  setCachedCheckIns: (
    dateKey: string,
    value: React.SetStateAction<CheckIn[]>
  ) => void;
};

const DashboardCheckInsCacheContext =
  createContext<DashboardCheckInsCacheContextValue | null>(null);

function hasFreshCheckInsCache(
  state: DashboardCheckInsCacheState,
  dateKey: string
) {
  if (state.fetchedAt === null) return false;
  if (state.dateKey !== dateKey) return false;

  return Date.now() - state.fetchedAt < CHECK_INS_CACHE_TTL_MS;
}

export function DashboardCheckInsCacheProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<DashboardCheckInsCacheState>({
    checkIns: [],
    dateKey: null,
    fetchedAt: null,
    isLoading: false,
  });
  const stateRef = useRef(state);
  const inFlightRef = useRef<Promise<CheckIn[]> | null>(null);

  stateRef.current = state;

  const fetchAndStoreCheckIns = useCallback((dateKey: string) => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    setState((current) => ({
      ...current,
      isLoading: true,
    }));

    const request = getCheckIns()
      .then((checkIns) => {
        setState({
          checkIns,
          dateKey,
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
    async (dateKey: string, options?: { force?: boolean }) => {
      const force = options?.force ?? false;
      const current = stateRef.current;

      if (!force && hasFreshCheckInsCache(current, dateKey)) {
        return current.checkIns;
      }

      if (!force && current.checkIns.length > 0) {
        if (!inFlightRef.current) {
          void fetchAndStoreCheckIns(dateKey).catch((error) => {
            console.error("Failed to refresh dashboard check-ins cache:", error);
          });
        }

        return current.checkIns;
      }

      return fetchAndStoreCheckIns(dateKey);
    },
    [fetchAndStoreCheckIns]
  );

  const setCachedCheckIns = useCallback(
    (dateKey: string, value: React.SetStateAction<CheckIn[]>) => {
      setState((current) => ({
        checkIns:
          typeof value === "function"
            ? value(current.checkIns)
            : value,
        dateKey,
        fetchedAt: Date.now(),
        isLoading: false,
      }));
    },
    []
  );

  useEffect(() => {
    const todayDateKey = formatLocalDateKey(new Date());

    void ensureCheckIns(todayDateKey).catch((error) => {
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
