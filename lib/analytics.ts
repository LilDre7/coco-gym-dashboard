"use client";

import { track } from "@vercel/analytics";

type AnalyticsValue = string | number | boolean | null | undefined;
type NormalizedAnalyticsValue = string | number | boolean | null;
type AnalyticsProperties = Record<string, AnalyticsValue>;

function normalizeValue(value: AnalyticsValue): AnalyticsValue {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

export function trackEvent(
  eventName: string,
  properties: AnalyticsProperties = {},
) {
  const normalizedProperties: Record<string, NormalizedAnalyticsValue> = Object.fromEntries(
    Object.entries(properties)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, normalizeValue(value) as NormalizedAnalyticsValue]),
  );

  try {
    void track(eventName, normalizedProperties);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Analytics event failed: ${eventName}`, error);
    }
  }
}
