import { getMembers } from "@/lib/actions";
import { enrichMemberData } from "@/lib/member-utils";
import { StatsCards } from "@/components/stats-cards";
import { DisciplineChart } from "@/components/discipline-chart";
import { RevenueCard } from "@/components/revenue-card";

export default async function DashboardPage() {
  const members = await getMembers();
  const enrichedMembers = members.map(enrichMemberData);

  return (
    <main className="w-full space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your gym membership stats
        </p>
      </div>

      <StatsCards members={enrichedMembers} />

      <div className="grid gap-6 md:grid-cols-2">
        <DisciplineChart members={enrichedMembers} />
        <RevenueCard members={enrichedMembers} />
      </div>
    </main>
  );
}
