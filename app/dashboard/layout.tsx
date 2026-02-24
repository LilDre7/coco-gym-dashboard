import { DashboardHeader } from "@/components/dashboard-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader />
      <div className="md:pl-64">
        <div className="mx-auto max-w-[110rem]">{children}</div>
      </div>
    </div>
  );
}
