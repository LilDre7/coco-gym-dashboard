import Link from "next/link";
import { CalendarDays, CalendarRange, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const reportOptions = [
  {
    href: "/dashboard/daily-report",
    title: "Cierre diario",
    description: "Consulta check-ins, ventas y métodos de pago de una fecha específica.",
    icon: CalendarDays,
  },
  {
    href: "/dashboard/monthly-report",
    title: "Cierre mensual",
    description: "Revisa membresías, actividad, check-ins y ventas del mes seleccionado.",
    icon: CalendarRange,
  },
];

export default function ReportsPage() {
  return (
    <main className="w-full space-y-6 p-4 pb-10 sm:p-6 lg:p-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"><FileText className="h-3.5 w-3.5" /> Reportes</div>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Cierres</h1>
        <p className="max-w-xl text-sm text-muted-foreground">Elige el tipo de reporte que necesitas generar.</p>
      </div>
      <section className="grid max-w-3xl gap-4 sm:grid-cols-2">
        {reportOptions.map((option) => (
          <Link key={option.href} href={option.href} className="group">
            <Card className="h-full border-border/70 transition-colors group-hover:border-primary/50 group-hover:bg-primary/5">
              <CardContent className="p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><option.icon className="h-5 w-5" /></div><h2 className="mt-4 text-lg font-semibold">{option.title}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{option.description}</p><p className="mt-5 text-sm font-medium text-primary">Abrir reporte →</p></CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}
