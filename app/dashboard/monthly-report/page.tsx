import { MonthlyReport } from "@/components/monthly-report";
import { getCheckIns, getMembers } from "@/lib/actions";
import { getCurrentMonthKey } from "@/lib/checkins";

function validMonth(value: string | undefined) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : getCurrentMonthKey();
}

export default async function MonthlyReportPage({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const params = await searchParams;
  const monthKey = validMonth(typeof params.month === "string" ? params.month : undefined);
  const [members, checkIns] = await Promise.all([getMembers(), getCheckIns(monthKey)]);
  return <MonthlyReport monthKey={monthKey} members={members} checkIns={checkIns} />;
}
