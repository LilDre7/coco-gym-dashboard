"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Download, FileText, ReceiptText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckIn, formatAmountCRC, formatLocalDateKey, formatSelectedDate } from "@/lib/checkins";
import { formatPersonName } from "@/lib/member-utils";
import { MemberRow } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";

const paymentLabels = { EFECTIVO: "Efectivo", TARJETA: "Tarjeta", SINPE: "SINPE" } as const;

export function DailyReport({ dateKey, members, checkIns }: { dateKey: string; members: MemberRow[]; checkIns: CheckIn[] }) {
  const router = useRouter();
  const data = useMemo(() => {
    const dailyCheckIns = checkIns.filter((item) => formatLocalDateKey(item.datetime) === dateKey);
    const sales = dailyCheckIns.filter((item) => item.hasPurchase);
    const payments = new Map<string, { count: number; amount: number }>();
    for (const sale of sales) {
      if (!sale.paymentMethod) continue;
      const current = payments.get(sale.paymentMethod) ?? { count: 0, amount: 0 };
      payments.set(sale.paymentMethod, { count: current.count + 1, amount: current.amount + (sale.amount ?? 0) });
    }
    return {
      checkIns: dailyCheckIns.length,
      visitors: new Set(dailyCheckIns.map((item) => formatPersonName(item.name))).size,
      sales: sales.length,
      income: sales.reduce((total, item) => total + (item.amount ?? 0), 0),
      payments,
      activeMembers: members.filter((item) => item.is_active).length,
    };
  }, [checkIns, dateKey, members]);

  function chooseDate(value: string) {
    if (!value) return;
    trackEvent("daily_report_date_changed", { date: value });
    router.push(`/dashboard/daily-report?date=${value}`);
  }
  function downloadPdf() {
    trackEvent("daily_report_pdf_requested", { date: dateKey });
    window.print();
  }

  return <main className="daily-report w-full space-y-6 p-4 pb-10 sm:p-6 lg:p-8">
    <div className="report-controls flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"><FileText className="h-3.5 w-3.5" /> Cierre diario</div><h1 className="mt-3 text-2xl font-semibold tracking-tight capitalize lg:text-3xl">Reporte del {formatSelectedDate(dateKey)}</h1><p className="mt-1 text-sm text-muted-foreground">Control numérico de actividad y ventas del día.</p></div>
      <div className="flex flex-wrap gap-2"><input aria-label="Fecha del cierre" type="date" value={dateKey} onChange={(event) => chooseDate(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" /><Button onClick={downloadPdf} className="gap-2"><Download className="h-4 w-4" /> Descargar PDF</Button></div>
    </div>
    <div className="report-document space-y-6 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6 print:border-0 print:p-0 print:shadow-none">
      <header className="flex items-start justify-between gap-4 border-b border-border pb-5"><div><p className="text-xs font-semibold tracking-[.18em] text-primary uppercase">Coco Gym Fitness</p><h2 className="mt-1 text-2xl font-bold">Cierre diario</h2><p className="mt-1 text-sm text-muted-foreground capitalize">{formatSelectedDate(dateKey)}</p></div><p className="text-right text-xs text-muted-foreground">Generado el<br />{new Intl.DateTimeFormat("es-CR", { dateStyle: "long", timeZone: "America/Costa_Rica" }).format(new Date())}</p></header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Check-ins" value={data.checkIns} detail={`${data.visitors} personas distintas`} icon={CalendarDays} /><Summary label="Ventas registradas" value={data.sales} detail="Compras en check-in" icon={ReceiptText} /><Summary label="Ventas del día" value={formatAmountCRC(data.income)} detail="Total vendido en mostrador" icon={ReceiptText} /><Summary label="Miembros en base" value={members.length} detail={`${data.activeMembers} fichas habilitadas`} icon={Users} /></section>
      <section className="break-inside-avoid rounded-xl border border-border p-4"><h3 className="font-semibold">Detalle por método de pago</h3><p className="mt-1 text-xs text-muted-foreground">Monto y cantidad de ventas registrados durante el día.</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{(Object.keys(paymentLabels) as Array<keyof typeof paymentLabels>).map((method) => { const payment = data.payments.get(method) ?? { count: 0, amount: 0 }; return <div key={method} className="rounded-xl bg-muted/50 p-4"><p className="text-sm text-muted-foreground">{paymentLabels[method]}</p><p className="mt-2 text-xl font-semibold tabular-nums">{formatAmountCRC(payment.amount)}</p><p className="mt-1 text-xs text-muted-foreground">{payment.count} ventas</p></div>; })}</div></section>
      <p className="text-xs text-muted-foreground">Los datos corresponden únicamente a los check-ins y compras registrados en la fecha seleccionada. No se incluyen nombres.</p>
    </div>
  </main>;
}

function Summary({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: React.ComponentType<{ className?: string }> }) {
  return <div className="rounded-xl border border-border bg-muted/20 p-4"><Icon className="h-4 w-4 text-primary" /><p className="mt-3 text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}
