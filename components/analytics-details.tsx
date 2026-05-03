"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckIn, formatAmountCRC, formatLocalDateKey } from "@/lib/checkins";
import {
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
      return "Activo";
    case "expiring":
      return "Por vencer";
    case "expired":
      return "Vencido";
    case "inactive":
      return "Inactivo";
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

  const sortedDisciplineRows = disciplineRows
    .filter((row) => row.members > 0)
    .sort((left, right) => right.members - left.members);

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
    { label: "Activos", value: activeMembers.length, color: STATUS_COLORS.active },
    { label: "Por vencer", value: expiringMembers.length, color: STATUS_COLORS.expiring },
    { label: "Vencidos", value: expiredMembers.length, color: STATUS_COLORS.expired },
    { label: "Inactivos", value: inactiveMembers.length, color: STATUS_COLORS.inactive },
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
    <div className="min-w-0 space-y-6">
      <section className="grid min-w-0 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="min-w-0 border-border/70 bg-card shadow-none">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <Badge
                    variant="outline"
                    className="border-primary/20 bg-primary/5 text-primary"
                  >
                    Datos de los últimos 30 días
                  </Badge>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    Membresías, visitas y caja
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Los ingresos recurrentes salen de la cuota mensual registrada. Las
                    visitas y ventas en mostrador vienen de los check-ins reales.
                  </p>
                </div>
                <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:max-w-md lg:grid-cols-1 xl:max-w-sm xl:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-muted/30 px-3 py-3 sm:px-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Ingreso recurrente (USD equiv.)
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {monthlyRevenueUsdEquivalent !== null
                        ? formatCurrency(monthlyRevenueUsdEquivalent, "USD")
                        : "Sin tasa"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatCurrency(revenueByCurrency.CRC, "CRC")} +{" "}
                      {formatCurrency(revenueByCurrency.USD, "USD")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 px-3 py-3 sm:px-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Ventas en check-in (30 d.)
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {formatAmountCRC(recentRevenueCRC)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {recentSales.length}{" "}
                      {recentSales.length === 1 ? "venta" : "ventas"} registradas
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    title: "Activos",
                    value: activeMembers.length,
                    helper: `${billableMembers.length} con cuota al día`,
                    icon: Users,
                    tone: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
                  },
                  {
                    title: "Visitas (30 d.)",
                    value: recentCheckIns.length,
                    helper: `${visitsLast7Days} esta semana`,
                    icon: Activity,
                    tone: "bg-sky-50 text-sky-700 border-sky-200/70",
                  },
                  {
                    title: "Personas distintas",
                    value: uniqueVisitors30d,
                    helper: `${avgVisitsPerActiveMember.toFixed(1)} visitas / activo`,
                    icon: Target,
                    tone: "bg-violet-50 text-violet-700 border-violet-200/70",
                  },
                  {
                    title: "Renovar",
                    value: expiringMembers.length + expiredMembers.length,
                    helper: `${dueIn7Days} vencen en 7 días`,
                    icon: CalendarClock,
                    tone: "bg-amber-50 text-amber-700 border-amber-200/70",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="min-w-0 rounded-2xl border border-border bg-background p-3 sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                      <div className={`shrink-0 rounded-xl border px-2 py-2 ${item.tone}`}>
                        <item.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">{item.helper}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border/70 bg-card shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Indicadores rápidos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Porcentajes sobre check-ins de los últimos 30 días.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Asistencia fuerte</span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {retentionReadiness.toFixed(0)}%
                </span>
              </div>
              <Progress value={clampPercent(retentionReadiness)} className="h-2.5" />
              <p className="mt-2 text-xs text-muted-foreground">
                Activos con 4+ días de visita en el período (un día cuenta si hubo al
                menos un check-in).
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Check-ins con compra</span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {salesConversion.toFixed(0)}%
                </span>
              </div>
              <Progress value={clampPercent(salesConversion)} className="h-2.5" />
              <p className="mt-2 text-xs text-muted-foreground">
                Qué parte de los check-ins llevaron venta en mostrador.
              </p>
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Wallet className="h-4 w-4 shrink-0 text-primary" />
                  Cuota en riesgo (vencidos / por vencer)
                </div>
                <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                  {formatCurrency(atRiskRevenue.USD, "USD")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(atRiskRevenue.CRC, "CRC")}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
                  Antigüedad media (facturables)
                </div>
                <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                  {formatTenure(Math.round(avgTenureDays || 0))}
                </p>
                <p className="text-xs text-muted-foreground">Activos + por vencer.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="min-w-0 border-border/70 bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Ingresos recurrentes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Suma de cuotas mensuales de socios activos y por vencer. El anual es cuota
              mensual × 12 (proyección simple). Las ventas del mostrador van aparte.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <CircleDollarSign className="h-4 w-4 shrink-0" />
                  Mensual (CRC)
                </div>
                <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
                  {formatCurrency(revenueByCurrency.CRC, "CRC")}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <CircleDollarSign className="h-4 w-4 shrink-0" />
                  Mensual (USD total)
                </div>
                <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
                  {monthlyRevenueUsdEquivalent !== null
                    ? formatCurrency(monthlyRevenueUsdEquivalent, "USD")
                    : "Sin tasa"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  CRC convertido + USD nativo.
                </p>
              </div>
              <div className="rounded-2xl border border-sky-200/70 bg-sky-50/70 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-sky-800">
                  <TrendingUp className="h-4 w-4 shrink-0" />
                  Anual proyectado (CRC)
                </div>
                <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
                  {formatCurrency(annualRecurringRevenueByCurrency.CRC, "CRC")}
                </p>
              </div>
              <div className="rounded-2xl border border-sky-200/70 bg-sky-50/70 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-sky-800">
                  <TrendingUp className="h-4 w-4 shrink-0" />
                  Anual proyectado (USD)
                </div>
                <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
                  {annualRevenueUsdEquivalent !== null
                    ? formatCurrency(annualRevenueUsdEquivalent, "USD")
                    : "Sin tasa"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                <AlertTriangle className="mt-0.5 hidden h-4 w-4 shrink-0 text-amber-600 sm:block" />
                <div className="min-w-0 space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Tasa USD/CRC: </span>
                    {usdToCrcRate
                      ? `1 USD = ${usdToCrcRate.toFixed(2)} CRC`
                      : "No cargada; el total USD puede faltar."}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Ventas mostrador (30 d.): </span>
                    {formatAmountCRC(recentRevenueCRC)} — no están incluidas arriba.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="min-w-0 border-border/70 bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Disciplinas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Socios totales vs. con cuota al día; barras según tu base actual.
            </p>
          </CardHeader>
          <CardContent className="min-h-[260px] w-full pt-2 sm:min-h-[300px] lg:min-h-[320px]">
            {chartData.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border px-2 text-center text-sm text-muted-foreground">
                Aún no hay datos para graficar.
              </div>
            ) : (
              <div className="h-[min(55vh,360px)] w-full min-w-0 sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, left: -8, right: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      height={56}
                      interval={0}
                      tick={{ fontSize: 10 }}
                      angle={-32}
                      textAnchor="end"
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
                      }}
                    />
                    <Bar dataKey="members" fill="#1f7a5a" radius={[8, 8, 0, 0]} name="Socios" />
                    <Bar dataKey="billable" fill="#d4a017" radius={[8, 8, 0, 0]} name="Con cuota" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border/70 bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Estado de membresías</CardTitle>
            <p className="text-sm text-muted-foreground">
              Partes del total de fichas en la base de datos.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusMix.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-background p-3 sm:p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate text-sm font-medium text-foreground">
                      {item.label}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {item.value}
                  </span>
                </div>
                <Progress
                  value={clampPercent(getPercent(item.value, members.length))}
                  className="h-2"
                />
              </div>
            ))}

            <div className="rounded-2xl border border-dashed border-border p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Prioridad</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {expiringMembers.length + expiredMembers.length} socios necesitan renovación
                    ({dueIn7Days} con fin de membresía en los próximos 7 días).
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <Card className="min-w-0 border-border/70 bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Detalle por disciplina</CardTitle>
            <p className="text-sm text-muted-foreground">
              Visitas = promedio de días con check-in (30 d.) por socio de esa disciplina.
            </p>
          </CardHeader>
          <CardContent className="min-w-0">
            {sortedDisciplineRows.length === 0 ? (
              <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                No hay disciplinas con socios registrados.
              </div>
            ) : (
              <>
            <ul className="space-y-3 lg:hidden">
              {sortedDisciplineRows.map((row) => (
                <li
                  key={row.discipline}
                  className="rounded-2xl border border-border bg-muted/15 p-4"
                >
                  <p className="font-medium text-foreground">{row.label}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Socios</dt>
                      <dd className="font-medium tabular-nums text-foreground">{row.members}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Con cuota</dt>
                      <dd className="font-medium tabular-nums text-foreground">{row.billable}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Visitas prom.</dt>
                      <dd className="font-medium tabular-nums text-foreground">
                        {row.avgVisitDays.toFixed(1)} d
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">Cuota mensual</dt>
                      <dd className="text-foreground">
                        {row.usdRevenue > 0 && (
                          <span className="mr-2">{formatCurrency(row.usdRevenue, "USD")}</span>
                        )}
                        {row.crcRevenue > 0 && (
                          <span>{formatCurrency(row.crcRevenue, "CRC")}</span>
                        )}
                        {row.usdRevenue <= 0 && row.crcRevenue <= 0 && "—"}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="-mx-1 hidden overflow-x-auto px-1 lg:block">
              <table className="w-full min-w-[640px] border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2">Disciplina</th>
                    <th className="pb-2">Socios</th>
                    <th className="pb-2">Cuota</th>
                    <th className="pb-2">Visitas</th>
                    <th className="pb-2">USD</th>
                    <th className="pb-2">CRC</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDisciplineRows.map((row) => (
                    <tr key={row.discipline} className="bg-muted/20">
                      <td className="rounded-l-2xl px-3 py-3 font-medium text-foreground">
                        {row.label}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-foreground">{row.members}</td>
                      <td className="px-3 py-3 tabular-nums text-foreground">{row.billable}</td>
                      <td className="px-3 py-3 tabular-nums text-foreground">
                        {row.avgVisitDays.toFixed(1)}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-foreground">
                        {row.usdRevenue > 0 ? formatCurrency(row.usdRevenue, "USD") : "—"}
                      </td>
                      <td className="rounded-r-2xl px-3 py-3 tabular-nums text-foreground">
                        {row.crcRevenue > 0 ? formatCurrency(row.crcRevenue, "CRC") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border/70 bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Lista de renovación</CardTitle>
            <p className="text-sm text-muted-foreground">
              Hasta 7 socios: por vencer o vencidos, los más urgentes primero.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {watchlist.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
                Nadie en lista crítica por ahora.
              </div>
            ) : (
              watchlist.map((member) => (
                <div
                  key={member.id}
                  className="rounded-2xl border border-border bg-background p-3 sm:p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {disciplineLabels[member.discipline]} · vence {formatDate(member.end_date)}
                      </p>
                    </div>
                    <Badge
                      className={`w-fit shrink-0 ${
                        member.days_remaining < 0
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {member.days_remaining < 0
                        ? `${Math.abs(member.days_remaining)} d retraso`
                        : `${member.days_remaining} d restantes`}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{getStatusLabel(member.status)}</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCurrency(member.monthly_fee, member.currency)}
                    </span>
                  </div>
                </div>
              ))
            )}

            <div className="rounded-2xl border border-dashed border-border p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">De dónde salen los datos</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Visitas: tabla de check-ins (últimos 30 d.). Ingresos recurrentes: cuota en cada
                    socio. Monedas separadas como en el resto del panel.
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
