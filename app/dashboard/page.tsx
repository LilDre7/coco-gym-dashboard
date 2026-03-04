import { CheckInsDashboard } from "@/components/checkins-dashboard";
import { getCheckIns, getMembers, getStoreProducts } from "@/lib/actions";
import { formatLocalDateKey } from "@/lib/checkins";
import { enrichMemberData } from "@/lib/member-utils";

function getDefaultTime(value: Date) {
  const hours = value.getHours().toString().padStart(2, "0");
  const minutes = value.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default async function DashboardPage() {
  const now = new Date();
  const initialDateKey = formatLocalDateKey(now);
  const initialTime = getDefaultTime(now);

  try {
    const checkIns = await getCheckIns();
    const storeProducts = await getStoreProducts();
    const members = await getMembers();
    const enrichedMembers = members.map(enrichMemberData);

    return (
      <CheckInsDashboard
        initialCheckIns={checkIns}
        initialProducts={storeProducts}
        initialMembers={enrichedMembers}
        initialDateKey={initialDateKey}
        initialTime={initialTime}
      />
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("check_ins")
    ) {
      return (
        <CheckInsDashboard
          initialCheckIns={[]}
          initialProducts={[]}
          initialMembers={[]}
          initialDateKey={initialDateKey}
          initialTime={initialTime}
        />
      );
    }

    throw error;
  }
}
