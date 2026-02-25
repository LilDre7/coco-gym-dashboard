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

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Actualizado recientemente";
  return new Intl.DateTimeFormat("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function ExchangeRateBar() {
  const [data, setData] = useState<ExchangeRateState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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

  const meta = useMemo(() => {
    if (!data) return "";
    const status = data.fallback ? "manual" : "en vivo";
    return `${status} · ${formatUpdatedAt(data.updatedAt)}`;
  }, [data]);

  return (
    <div className="sticky top-0 z-50 border-b border-emerald-300/50 bg-emerald-100/85 px-4 py-1.5 text-[11px] text-emerald-900 backdrop-blur sm:px-6 sm:text-xs">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3">
        <p className="truncate font-medium">{label}</p>
        <p className="shrink-0 text-emerald-800/90">{meta}</p>
      </div>
    </div>
  );
}

