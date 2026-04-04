import { CheckInsDashboardRoute } from "@/components/checkins-dashboard-route";
import { getMembers, getStoreProducts } from "@/lib/actions";
import { formatLocalDateKey, formatTimeHHMMInCostaRica } from "@/lib/checkins";
import { enrichMemberData } from "@/lib/member-utils";

export default async function DashboardPage() {
  const now = new Date();
  const initialDateKey = formatLocalDateKey(now);
  const initialTime = formatTimeHHMMInCostaRica(now);
  const [storeProducts, members] = await Promise.all([
    getStoreProducts(),
    getMembers(),
  ]);
  const enrichedMembers = members.map(enrichMemberData);

  return (
    <CheckInsDashboardRoute
      initialProducts={storeProducts}
      initialMembers={enrichedMembers}
      initialDateKey={initialDateKey}
      initialTime={initialTime}
    />
  );
}
