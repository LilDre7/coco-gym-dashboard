import { getCheckIns, getMembers } from "@/lib/actions";
import { enrichMemberData } from "@/lib/member-utils";
import { AnalyticsDetails } from "@/components/analytics-details";

export default async function AnalyticsPage() {
  const members = await getMembers();
  const checkIns = await getCheckIns();
  const enrichedMembers = members.map(enrichMemberData);

  return (
    <main className="w-full space-y-6 p-4 sm:p-6 lg:space-y-8 lg:p-8">
      <div className="space-y-2">
        <div className="inline-flex items-center rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Operations Dashboard
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
            Analytics
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground lg:text-base">
            Detailed insights into your gym performance with real attendance,
            cleaner revenue separation, and a design that fits the rest of the
            dashboard.
          </p>
        </div>
      </div>

      <AnalyticsDetails members={enrichedMembers} checkIns={checkIns} />
    </main>
  );
}
