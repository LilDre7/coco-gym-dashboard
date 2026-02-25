"use client";

import { useEffect, useMemo, useState } from "react";

type ExchangeRateState = {
  rate: number;
  updatedAt: string;
  source: string;
  fallback: boolean;
};

function formatRate(value: number): string {
  return new Intl.NumberFormat("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ExchangeRateBar() {
  const [data, setData] = useState<ExchangeRateState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadRate = async () => {
      try {
        const response = await fetch("/api/exchange-rate", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load exchange rate");
        const payload = (await response.json()) as ExchangeRateState;
        if (!isMounted) return;
        setData(payload);
        setHasError(false);
      } catch {
        if (!isMounted) return;
        setHasError(true);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    void loadRate();
    const interval = setInterval(loadRate, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const label = useMemo(() => {
    if (isLoading) return "Cargando tipo de cambio USD/CRC...";
    if (hasError || !data) return "No se pudo actualizar el tipo de cambio USD/CRC";
    return `USD 1 = CRC ${formatRate(data.rate)}`;
  }, [data, hasError, isLoading]);

  const statusLabel = useMemo(() => {
    if (isLoading) return "Cargando";
    if (hasError || !data) return "Sin conexión";
    return data.fallback ? "Manual" : "En vivo";
  }, [data, hasError, isLoading]);

  const gymDateTime = useMemo(() => {
    if (!now) return "";
    return new Intl.DateTimeFormat("es-CR", {
      timeZone: "America/Costa_Rica",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
  }, [now]);

  return (
    <div className="sticky top-0 z-50 border-b border-emerald-300/50 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-950 sm:px-6">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3">
        <p className="truncate font-medium">
          {label}
          <span className="ml-2 text-emerald-700">({statusLabel})</span>
        </p>
        <p className="shrink-0 text-emerald-800">
          {gymDateTime || "CR: --:--"}
        </p>
      </div>
    </div>
  );
}
