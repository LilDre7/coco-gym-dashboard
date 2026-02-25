import { NextResponse } from "next/server";

const DEFAULT_PROVIDER_URL = "https://open.er-api.com/v6/latest/USD";

function getManualRate(): number | null {
  const value = process.env.EXCHANGE_RATE_MANUAL_CRC_PER_USD;
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getProviderUrl(): string {
  return process.env.EXCHANGE_RATE_API_URL || DEFAULT_PROVIDER_URL;
}

type ProviderPayload = {
  rates?: Record<string, number>;
  time_last_update_utc?: string;
  time_last_update_unix?: number;
};

async function fetchUsdToCrcRate() {
  const response = await fetch(getProviderUrl(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Provider request failed with ${response.status}`);
  }

  const payload = (await response.json()) as ProviderPayload;
  const rate = payload?.rates?.CRC;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Provider returned an invalid CRC rate");
  }

  const updatedAt =
    payload.time_last_update_utc ||
    (payload.time_last_update_unix
      ? new Date(payload.time_last_update_unix * 1000).toISOString()
      : new Date().toISOString());

  return {
    rate,
    updatedAt,
    source: "open.er-api.com",
    fallback: false,
  };
}

export async function GET() {
  try {
    const data = await fetchUsdToCrcRate();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch (error) {
    const manualRate = getManualRate();
    if (manualRate) {
      return NextResponse.json(
        {
          rate: manualRate,
          updatedAt: new Date().toISOString(),
          source: "manual-env",
          fallback: true,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          },
        }
      );
    }

    return NextResponse.json(
      {
        message: "Could not fetch USD/CRC exchange rate",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
