import { DailyReport } from "@/components/daily-report";
import { getCheckIns, getMembers } from "@/lib/actions";
import { formatLocalDateKey, getMonthKeyFromDateKey } from "@/lib/checkins";

function validDate(value: string | undefined) {
  return value && /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(value)
    ? value
    : formatLocalDateKey(new Date());
}

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const params = await searchParams;
  const dateKey = validDate(typeof params.date === "string" ? params.date : undefined);
  const [members, checkIns] = await Promise.all([
    getMembers(),
    getCheckIns(getMonthKeyFromDateKey(dateKey)),
  ]);

  return <DailyReport dateKey={dateKey} members={members} checkIns={checkIns} />;
}
