"use client";

import { useEffect, useState } from "react";

type AnalyticsComponent = React.ComponentType;

/** Loads optional analytics after the page becomes interactive. */
export function DeferredAnalytics() {
  const [Analytics, setAnalytics] = useState<AnalyticsComponent | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = () => {
      void import("@vercel/analytics/next").then(({ Analytics: VercelAnalytics }) => {
        if (!cancelled) setAnalytics(() => VercelAnalytics);
      });
    };

    // Delay non-essential tracking until the main interface has had a chance
    // to render and become interactive.
    const timeoutId = window.setTimeout(loadAnalytics, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  return Analytics ? <Analytics /> : null;
}
