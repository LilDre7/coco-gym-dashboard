"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckIn, formatAmountCRC, formatLocalDateKey } from "@/lib/checkins";
import {
  EXPIRING_THRESHOLD_DAYS,
  formatCurrency,
  formatDate,
  formatPersonName,
  formatTenure,
  getFirstNameAndSurnameKey,
} from "@/lib/member-utils";
import { Currency, Discipline, MemberWithStatus, disciplineLabels } from "@/lib/types";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  ShieldAlert,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AnalyticsDetailsProps {
  members: MemberWithStatus[];
  checkIns: CheckIn[];
}

const STATUS_COLORS = {
  active: "#1f7a5a",
  expiring: "#d4a017",
  expired: "#dc6b4b",
  inactive: "#64748b",
} as const;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function subtractDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

function getMemberLookupKeys(name: string) {
  const normalized = formatPersonName(name);
  const key = getFirstNameAndSurnameKey(name);
  return [normalized, key].filter(Boolean);
}

function getCheckInLookupKeys(name: string) {
  return getMemberLookupKeys(name);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getPercent(part: number, total: number) {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

function getStatusLabel(status: MemberWithStatus["status"]) {
  switch (status) {
    case "active":
      return "Active";
    case "expiring":
      return "Expiring";
    case "expired":
      return "Expired";
    case "inactive":
      return "Inactive";
  }
}

export function AnalyticsDetails({ members, checkIns }: AnalyticsDetailsProps) {
  const [usdToCrcRate, setUsdToCrcRate] = useState<number | null>(null);
  const today = startOfDay(new Date());
  const thirtyDaysAgo = subtractDays(today, 29);
  const sevenDaysAgo = subtractDays(today, 6);

  const activeMembers = members.filter((member) => member.status === "active");
  const billableMembers = members.filter(
    (member) => member.status === "active" || member.status === "expiring",
  );
  const expiringMembers = members.filter((member) => member.status === "expiring");
  const expiredMembers = members.filter((member) => member.status === "expired");
  const inactiveMembers = members.filter((member) => member.status === "inactive");

  const recentCheckIns = checkIns.filter((checkIn) => {
    const checkInDate = startOfDay(new Date(checkIn.datetime));
    return checkInDate >= thirtyDaysAgo && checkInDate <= today;
  });

  const recentSales = recentCheckIns.filter((checkIn) => checkIn.hasPurchase);
  const recentRevenueCRC = recentSales.reduce(
    (sum, checkIn) => sum + (checkIn.amount ?? 0),
    0,
  );

  const recentVisitDaysByMember = new Map<string, Set<string>>();
  for (const checkIn of recentCheckIns) {
    const dateKey = formatLocalDateKey(checkIn.datetime);
    for (const key of getCheckInLookupKeys(checkIn.name)) {
      if (!recentVisitDaysByMember.has(key)) {
        recentVisitDaysByMember.set(key, new Set<string>());
      }
      recentVisitDaysByMember.get(key)?.add(dateKey);
    }
  }

  const engagementRows = members.map((member) => {
    const keys = getMemberLookupKeys(member.name);
    const visitDays = new Set<string>();

    for (const key of keys) {
      for (const day of recentVisitDaysByMember.get(key) ?? []) {
        visitDays.add(day);
      }
    }

    return {
      member,
      visitDays: visitDays.size,
    };
  });

  const engagedMembers = engagementRows.filter(
    (entry) => entry.member.status === "active" && entry.visitDays >= 4,
  );

  const uniqueVisitors30d = new Set(
    recentCheckIns.map((checkIn) => formatPersonName(checkIn.name)),
  ).size;

  const visitsLast7Days = recentCheckIns.filter((checkIn) => {
    const checkInDate = startOfDay(new Date(checkIn.datetime));
    return checkInDate >= sevenDaysAgo;
  }).length;

  const dueIn7Days = members.filter(
    (member) => member.days_remaining >= 0 && member.days_remaining <= 7,
  ).length;

  const avgVisitsPerActiveMember =
    activeMembers.length > 0 ? recentCheckIns.length / activeMembers.length : 0;

  const salesConversion = getPercent(recentSales.length, recentCheckIns.length);
  const retentionReadiness = getPercent(engagedMembers.length, activeMembers.length);

  const revenueByCurrency = billableMembers.reduce<Record<Currency, number>>(
    (accumulator, member) => {
      const currency = member.currency ?? "USD";
      accumulator[currency] = (accumulator[currency] ?? 0) + member.monthly_fee;
      return accumulator;
    },
    { USD: 0, CRC: 0 },
  );
  const annualRecurringRevenueByCurrency = {
    USD: revenueByCurrency.USD * 12,
    CRC: revenueByCurrency.CRC * 12,
  };
  const monthlyRevenueUsdEquivalent =
    usdToCrcRate && usdToCrcRate > 0
      ? revenueByCurrency.USD + revenueByCurrency.CRC / usdToCrcRate
      : null;
  const annualRevenueUsdEquivalent =
    usdToCrcRate && usdToCrcRate > 0
      ? annualRecurringRevenueByCurrency.USD +
        annualRecurringRevenueByCurrency.CRC / usdToCrcRate
      : null;

  const atRiskRevenue = [...expiringMembers, ...expiredMembers].reduce<
    Record<Currency, number>
  >(
    (accumulator, member) => {
      const currency = member.currency ?? "USD";
      accumulator[currency] = (accumulator[currency] ?? 0) + member.monthly_fee;
      return accumulator;
    },
    { USD: 0, CRC: 0 },
  );

  const disciplineRows = (Object.keys(disciplineLabels) as Discipline[]).map(
    (discipline) => {
      const disciplineMembers = members.filter((member) => member.discipline === discipline);
      const disciplineActive = disciplineMembers.filter(
        (member) => member.status === "active" || member.status === "expiring",
      );
      const disciplineVisits = engagementRows
        .filter((entry) => entry.member.discipline === discipline)
        .reduce((sum, entry) => sum + entry.visitDays, 0);

      const disciplineRevenue = disciplineActive.reduce<Record<Currency, number>>(
        (accumulator, member) => {
          const currency = member.currency ?? "USD";
          accumulator[currency] = (accumulator[currency] ?? 0) + member.monthly_fee;
          return accumulator;
        },
        { USD: 0, CRC: 0 },
      );

      return {
        discipline,
        label: disciplineLabels[discipline],
        members: disciplineMembers.length,
        billable: disciplineActive.length,
        avgVisitDays:
          disciplineMembers.length > 0 ? disciplineVisits / disciplineMembers.length : 0,
        usdRevenue: disciplineRevenue.USD,
        crcRevenue: disciplineRevenue.CRC,
      };
    },
  );

  const chartData = disciplineRows
    .filter((row) => row.members > 0)
    .sort((left, right) => right.members - left.members)
    .map((row) => ({
      name: row.label.length > 16 ? `${row.label.slice(0, 14)}...` : row.label,
      members: row.members,
      billable: row.billable,
      avgVisitDays: Number(row.avgVisitDays.toFixed(1)),
    }));

  const statusMix = [
    { label: "Active", value: activeMembers.length, color: STATUS_COLORS.active },
    { label: "Expiring", value: expiringMembers.length, color: STATUS_COLORS.expiring },
    { label: "Expired", value: expiredMembers.length, color: STATUS_COLORS.expired },
    { label: "Inactive", value: inactiveMembers.length, color: STATUS_COLORS.inactive },
  ].filter((item) => item.value > 0);

  const watchlist = [...expiringMembers, ...expiredMembers]
    .sort((left, right) => left.days_remaining - right.days_remaining)
    .slice(0, 7);

  const avgTenureDays =
    billableMembers.reduce((sum, member) => sum + member.tenure_days, 0) /
    Math.max(billableMembers.length, 1);

  useEffect(() => {
    let isMounted = true;

    async function loadExchangeRate() {
      try {
        const response = await fetch("/api/exchange-rate", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load exchange rate");
        const payload = (await response.json()) as { rate?: number };
        if (!isMounted) return;
        if (typeof payload.rate === "number" && Number.isFinite(payload.rate) && payload.rate > 0) {
          setUsdToCrcRate(payload.rate);
          return;
        }
        setUsdToCrcRate(null);
      } catch {
        if (!isMounted) return;
        setUsdToCrcRate(null);
      }
    }

    void loadExchangeRate();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-border/70 bg-card shadow-none">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <Badge
                    variant="outline"
                    className="border-primary/20 bg-primary/5 text-primary"
                  >
                    Analytics grounded in real activity
                  </Badge>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                    Member health, attendance, and revenue in one place
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    This dashboard now combines membership status with real check-ins
                    and sales from the last 30 days, so the numbers reflect what is
                    actually happening in the gym.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Billable MRR Total
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {monthlyRevenueUsdEquivalent !== null
                        ? formatCurrency(monthlyRevenueUsdEquivalent, "USD")
                        : "Sin tasa"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(revenueByCurrency.CRC, "CRC")} +{" "}
                      {formatCurrency(revenueByCurrency.USD, "USD")} nativo
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      30d Sales
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatAmountCRC(recentRevenueCRC)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {recentSales.length} purchase records
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    title: "Active base",
                    value: activeMembers.length,
                    helper: `${billableMembers.length} billable now`,
                    icon: Users,
                    tone: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
                  },
                  {
                    title: "Visits last 30d",
                    value: recentCheckIns.length,
                    helper: `${visitsLast7Days} in the last 7 days`,
                    icon: Activity,
                    tone: "bg-sky-50 text-sky-700 border-sky-200/70",
                  },
                  {
                    title: "Unique visitors",
                    value: uniqueVisitors30d,
                    helper: `${avgVisitsPerActiveMember.toFixed(1)} avg visits per active`,
                    icon: Target,
                    tone: "bg-violet-50 text-violet-700 border-violet-200/70",
                  },
                  {
                    title: "Renewal pressure",
                    value: expiringMembers.length + expiredMembers.length,
                    helper: `${dueIn7Days} due in 7 days`,
                    icon: CalendarClock,
                    tone: "bg-amber-50 text-amber-700 border-amber-200/70",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                      <div className={`rounded-xl border px-2 py-2 ${item.tone}`}>
                        <item.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Performance summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Retention readiness</span>
                <span className="font-medium text-foreground">
                  {retentionReadiness.toFixed(0)}%
                </span>
              </div>
              <Progress value={clampPercent(retentionReadiness)} className="h-2.5" />
              <p className="mt-2 text-xs text-muted-foreground">
                Active members with 4 or more visit-days in the last 30 days.
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sales conversion</span>
                <span className="font-medium text-foreground">
                  {salesConversion.toFixed(0)}%
                </span>
              </div>
              <Progress value={clampPercent(salesConversion)} className="h-2.5" />
              <p className="mt-2 text-xs text-muted-foreground">
                Share of check-ins in the last 30 days that included a purchase.
              </p>
            </div>

            <Separator />

            <div className="grid gap-3">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Wallet className="h-4 w-4 text-primary" />
                  At-risk recurring revenue
                </div>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatCurrency(atRiskRevenue.USD, "USD")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(atRiskRevenue.CRC, "CRC")}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Average billable tenure
                </div>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatTenure(Math.round(avgTenureDays || 0))}
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on active and expiring members.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Ingresos del negocio</CardTitle>
            <p className="text-sm text-muted-foreground">
              Basado en membresias activas y por vencer registradas en la base de datos.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <CircleDollarSign className="h-4 w-4" />
                Ingreso mensual CRC
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {formatCurrency(revenueByCurrency.CRC, "CRC")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recurrente actual de membresias en colones.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <CircleDollarSign className="h-4 w-4" />
                Ingreso mensual total USD
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {monthlyRevenueUsdEquivalent !== null
                  ? formatCurrency(monthlyRevenueUsdEquivalent, "USD")
                  : "Sin tasa"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Equivalente total en dolares, incluyendo CRC convertido.
              </p>
            </div>

            <div className="rounded-2xl border border-sky-200/70 bg-sky-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-sky-800">
                <TrendingUp className="h-4 w-4" />
                Proyeccion anual CRC
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {formatCurrency(annualRecurringRevenueByCurrency.CRC, "CRC")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mensual actual x 12 segun la base activa.
              </p>
            </div>

            <div className="rounded-2xl border border-sky-200/70 bg-sky-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-sky-800">
                <TrendingUp className="h-4 w-4" />
                Proyeccion anual total USD
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {annualRevenueUsdEquivalent !== null
                  ? formatCurrency(annualRevenueUsdEquivalent, "USD")
                  : "Sin tasa"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Equivalente anual en dolares usando la tasa actual.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Lectura rapida</CardTitle>
            <p className="text-sm text-muted-foreground">
              Vista ejecutiva del ingreso recurrente y ventas recientes.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Wallet className="h-4 w-4 text-primary" />
                Facturacion recurrente mensual
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">CRC</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(revenueByCurrency.CRC, "CRC")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Monto nativo en CRC</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    USD total
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {monthlyRevenueUsdEquivalent !== null
                      ? formatCurrency(monthlyRevenueUsdEquivalent, "USD")
                      : "Sin tasa"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Incluye CRC convertido + USD nativo.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <TrendingUp className="h-4 w-4 text-primary" />
                Facturacion recurrente anual proyectada
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">CRC</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(annualRecurringRevenueByCurrency.CRC, "CRC")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Monto nativo en CRC</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    USD total
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {annualRevenueUsdEquivalent !== null
                      ? formatCurrency(annualRevenueUsdEquivalent, "USD")
                      : "Sin tasa"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Incluye CRC convertido + USD nativo.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-foreground">Como se calcula</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    El mensual usa membresias activas y por vencer. El anual es una proyeccion
                    simple de ese ingreso mensual multiplicado por 12.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    El total en USD convierte CRC a dolares con la tasa actual
                    {usdToCrcRate ? `: 1 USD = ${usdToCrcRate.toFixed(2)} CRC.` : "."}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ventas del check-in se mantienen separadas: {formatAmountCRC(recentRevenueCRC)}
                    {" "}en los ultimos 30 dias.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Discipline activity mix</CardTitle>
            <p className="text-sm text-muted-foreground">
              Members, billable base, and average visit-days over the last 30 days.
            </p>
          </CardHeader>
          <CardContent className="h-[330px] pt-2">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                No analytics data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, left: 0, right: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 18px 35px rgba(15, 23, 42, 0.08)",
                    }}
                  />
                  <Bar dataKey="members" fill="#1f7a5a" radius={[10, 10, 0, 0]} name="Members" />
                  <Bar dataKey="billable" fill="#d4a017" radius={[10, 10, 0, 0]} name="Billable" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Status mix</CardTitle>
            <p className="text-sm text-muted-foreground">
              Operational view of your current membership base.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusMix.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-background p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{item.value}</span>
                </div>
                <Progress
                  value={clampPercent(getPercent(item.value, members.length))}
                  className="h-2"
                />
              </div>
            ))}

            <div className="rounded-2xl border border-dashed border-border p-4">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-foreground">Immediate follow-up</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {expiringMembers.length + expiredMembers.length} members need renewal
                    attention, with {dueIn7Days} inside the next 7 days.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Discipline precision table</CardTitle>
            <p className="text-sm text-muted-foreground">
              A cleaner operational breakdown aligned with the rest of the dashboard.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px] border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 font-medium">Discipline</th>
                    <th className="pb-2 font-medium">Members</th>
                    <th className="pb-2 font-medium">Billable</th>
                    <th className="pb-2 font-medium">Avg visit-days</th>
                    <th className="pb-2 font-medium">Revenue USD</th>
                    <th className="pb-2 font-medium">Revenue CRC</th>
                  </tr>
                </thead>
                <tbody>
                  {disciplineRows
                    .filter((row) => row.members > 0)
                    .sort((left, right) => right.members - left.members)
                    .map((row) => (
                      <tr key={row.discipline} className="bg-muted/20">
                        <td className="rounded-l-2xl px-3 py-3 font-medium text-foreground">
                          {row.label}
                        </td>
                        <td className="px-3 py-3 text-foreground">{row.members}</td>
                        <td className="px-3 py-3 text-foreground">{row.billable}</td>
                        <td className="px-3 py-3 text-foreground">
                          {row.avgVisitDays.toFixed(1)}
                        </td>
                        <td className="px-3 py-3 text-foreground">
                          {row.usdRevenue > 0 ? formatCurrency(row.usdRevenue, "USD") : "-"}
                        </td>
                        <td className="rounded-r-2xl px-3 py-3 text-foreground">
                          {row.crcRevenue > 0 ? formatCurrency(row.crcRevenue, "CRC") : "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Renewal watchlist</CardTitle>
            <p className="text-sm text-muted-foreground">
              Who needs attention first based on actual membership status.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {watchlist.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                No members at risk right now.
              </div>
            ) : (
              watchlist.map((member) => (
                <div key={member.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {disciplineLabels[member.discipline]} • {formatDate(member.end_date)}
                      </p>
                    </div>
                    <Badge
                      className={
                        member.days_remaining < 0
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }
                    >
                      {member.days_remaining < 0
                        ? `${Math.abs(member.days_remaining)}d overdue`
                        : `${member.days_remaining}d left`}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{getStatusLabel(member.status)}</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(member.monthly_fee, member.currency)}
                    </span>
                  </div>
                </div>
              ))
            )}

            <div className="rounded-2xl border border-dashed border-border p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-foreground">Why this is more precise</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Attendance uses the last 30 days of real `check_ins`, while
                    recurring revenue still comes from member subscriptions and stays
                    separated by currency.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
