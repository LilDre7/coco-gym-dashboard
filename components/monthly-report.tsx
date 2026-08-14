"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Download, FileText, ReceiptText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckIn, formatAmountCRC, formatLocalDateKey, formatMonthLabel, formatSelectedDate } from "@/lib/checkins";
import { enrichMemberData, formatPersonName } from "@/lib/member-utils";
import { MemberRow } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";

export function MonthlyReport({ monthKey, members, checkIns }: { monthKey: string; members: MemberRow[]; checkIns: CheckIn[] }) {
  const router = useRouter();
  const data = useMemo(() => {
    const sales = checkIns.filter((item) => item.hasPurchase);
    const memberStatus = members.map(enrichMemberData);
    const unique = new Set(checkIns.map((item) => formatPersonName(item.name))).size;
    const daily = new Map<string, number>();
    const payments = new Map<string, { count: number; amount: number }>();
    checkIns.forEach((item) => {
      const date = formatLocalDateKey(item.datetime);
      daily.set(date, (daily.get(date) ?? 0) + 1);
      if (item.hasPurchase && item.paymentMethod) {
        const payment = payments.get(item.paymentMethod) ?? { count: 0, amount: 0 };
        payments.set(item.paymentMethod, { count: payment.count + 1, amount: payment.amount + (item.amount ?? 0) });
      }
    });
    return {
      sales, unique, daily: [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)), payments,
      income: sales.reduce((total, item) => total + (item.amount ?? 0), 0),
      active: memberStatus.filter((item) => item.status === "active").length,
      expiring: memberStatus.filter((item) => item.status === "expiring").length,
      paymentDue: memberStatus.filter((item) => item.status === "payment-due").length,
      expired: memberStatus.filter((item) => item.status === "expired").length,
      inactive: memberStatus.filter((item) => item.status === "inactive").length,
      daysWithActivity: daily.size,
      busiestDay: Math.max(0, ...daily.values()),
      averagePerActiveDay: daily.size > 0 ? checkIns.length / daily.size : 0,
      newMembers: members.filter((item) => item.start_date.slice(0, 7) === monthKey),
      membershipsEndingThisMonth: members.filter((item) => item.end_date.slice(0, 7) === monthKey),
    };
  }, [checkIns, members, monthKey]);

  function chooseMonth(value: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return;
    trackEvent("monthly_report_month_changed", { month: value });
    router.push(`/dashboard/monthly-report?month=${value}`);
  }
  function downloadPdf() { trackEvent("monthly_report_pdf_requested", { month: monthKey }); window.print(); }

  return <main className="monthly-report w-full space-y-6 p-4 pb-10 sm:p-6 lg:p-8">
    <div className="report-controls flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"><FileText className="h-3.5 w-3.5" /> Cierre mensual</div><h1 className="mt-3 text-2xl font-semibold tracking-tight capitalize lg:text-3xl">Reporte de {formatMonthLabel(`${monthKey}-01`)}</h1><p className="mt-1 text-sm text-muted-foreground">Resumen de miembros, check-ins y ventas del período seleccionado.</p></div>
      <div className="flex flex-wrap gap-2"><input aria-label="Mes del cierre" type="month" value={monthKey} onChange={(e) => chooseMonth(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" /><Button onClick={downloadPdf} className="gap-2"><Download className="h-4 w-4" /> Descargar PDF</Button></div>
    </div>
    <div className="report-document space-y-6 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6 print:border-0 print:p-0 print:shadow-none">
      <header className="flex items-start justify-between gap-4 border-b border-border pb-5"><div><p className="text-xs font-semibold tracking-[.18em] text-primary uppercase">Coco Gym Fitness</p><h2 className="mt-1 text-2xl font-bold">Cierre mensual</h2><p className="mt-1 text-sm text-muted-foreground capitalize">{formatMonthLabel(`${monthKey}-01`)}</p></div><p className="text-right text-xs text-muted-foreground">Generado el<br />{new Intl.DateTimeFormat("es-CR", { dateStyle: "long", timeZone: "America/Costa_Rica" }).format(new Date())}</p></header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Check-ins" value={checkIns.length} detail={`${data.unique} personas distintas`} icon={CalendarDays} /><Summary label="Promedio por visitante" value={data.unique ? (checkIns.length / data.unique).toFixed(1) : "0"} detail="check-ins en el mes" icon={Users} /><Summary label="Ventas registradas" value={data.sales.length} detail={formatAmountCRC(data.income)} icon={ReceiptText} /><Summary label="Miembros activos actualmente" value={data.active} detail={`${members.length} en la base actual`} icon={Users} /></section>
      <section className="grid gap-6 lg:grid-cols-2"><Section title="Control de membresías" subtitle="Estados calculados según la fecha de vencimiento; no incluye nombres."><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label="Total en base" value={members.length} /><Metric label="Activos actualmente" value={data.active} /><Metric label="Por vencer" value={data.expiring} /><Metric label="Pago hoy" value={data.paymentDue} /><Metric label="Vencidos" value={data.expired} /><Metric label="Inactivos" value={data.inactive} /><Metric label="Inicios del mes" value={data.newMembers.length} /><Metric label="Vencimientos del mes" value={data.membershipsEndingThisMonth.length} /></div></Section><Section title="Ventas de check-in"><p className="text-3xl font-semibold tabular-nums">{formatAmountCRC(data.income)}</p><p className="text-xs text-muted-foreground">Total vendido en mostrador · {data.sales.length} ventas</p><div className="mt-4 grid grid-cols-3 gap-2">{["EFECTIVO", "TARJETA", "SINPE"].map((method) => { const payment = data.payments.get(method) ?? { count: 0, amount: 0 }; return <div key={method} className="rounded-lg bg-muted/50 p-2.5"><p className="text-xs text-muted-foreground">{method === "EFECTIVO" ? "Efectivo" : method === "TARJETA" ? "Tarjeta" : "SINPE"}</p><p className="mt-1 text-sm font-semibold">{formatAmountCRC(payment.amount)}</p><p className="mt-1 text-xs text-muted-foreground">{payment.count} ventas</p></div>; })}</div></Section></section>
      <section><Section title="Actividad diaria"><div className="mb-4 grid grid-cols-3 gap-2"><Metric label="Días con actividad" value={data.daysWithActivity} /><Metric label="Máximo en un día" value={data.busiestDay} /><Metric label="Promedio por día activo" value={data.averagePerActiveDay.toFixed(1)} /></div>{data.daily.length ? <div className="space-y-2">{data.daily.map(([date, visits]) => <div key={date} className="flex justify-between gap-3 text-sm"><span className="capitalize text-muted-foreground">{formatSelectedDate(date)}</span><span className="font-semibold">{visits}</span></div>)}</div> : <Empty>Sin actividad registrada.</Empty>}</Section></section>
      <p className="text-xs text-muted-foreground">Nota: los inicios y vencimientos se calculan con las fechas actuales guardadas en cada ficha. Los check-ins y las ventas corresponden al mes seleccionado.</p>
    </div>
  </main>;
}
function Summary({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: React.ComponentType<{ className?: string }> }) { return <div className="rounded-xl border border-border bg-muted/20 p-4"><Icon className="h-4 w-4 text-primary" /><p className="mt-3 text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>; }
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) { return <section className="break-inside-avoid rounded-xl border border-border p-4"><h3 className="font-semibold">{title}</h3>{subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}<div className="mt-4">{children}</div></section>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>; }
function Empty({ children }: { children: React.ReactNode }) { return <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">{children}</p>; }
