"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MemberWithStatus,
  Discipline,
  Currency,
  disciplineLabels,
} from "@/lib/types";
import { formatCurrency } from "@/lib/member-utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface AnalyticsDetailsProps {
  members: MemberWithStatus[];
}

export function AnalyticsDetails({ members }: AnalyticsDetailsProps) {
  const activeMembers = members.filter(
    (m) => m.status === "active" || m.status === "expiring"
  );

  // Group revenue by discipline and currency
  const revenueMap: Record<string, { usd: number; crc: number }> = {};
  for (const m of activeMembers) {
    const key = m.discipline;
    if (!revenueMap[key]) revenueMap[key] = { usd: 0, crc: 0 };
    if ((m.currency || "USD") === "CRC") {
      revenueMap[key].crc += m.monthly_fee;
    } else {
      revenueMap[key].usd += m.monthly_fee;
    }
  }

  const barData = (Object.entries(revenueMap) as [string, { usd: number; crc: number }][]).map(
    ([discipline, rev]) => ({
      name: disciplineLabels[discipline as Discipline] || discipline,
      USD: rev.usd,
      CRC: rev.crc,
    })
  );

  const hasCRC = barData.some((d) => d.CRC > 0);
  const hasUSD = barData.some((d) => d.USD > 0);

  const expiringMembers = members
    .filter((m) => m.status === "expiring" || m.status === "expired")
    .sort((a, b) => a.days_remaining - b.days_remaining);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Discipline</CardTitle>
        </CardHeader>
        <CardContent>
          {barData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              No revenue data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (hasUSD && !hasCRC ? `$${v}` : `${v}`)}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value, name as Currency),
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e5e5",
                    borderRadius: "6px",
                  }}
                />
                {hasUSD && (
                  <Bar
                    dataKey="USD"
                    fill="#2d6a4f"
                    radius={[4, 4, 0, 0]}
                    name="USD"
                  />
                )}
                {hasCRC && (
                  <Bar
                    dataKey="CRC"
                    fill="#d4a017"
                    radius={[4, 4, 0, 0]}
                    name="CRC"
                  />
                )}
                {hasUSD && hasCRC && <Legend />}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Expiring & Expired Members
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {expiringMembers.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              No expiring members
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Discipline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringMembers.slice(0, 8).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>
                      <span
                        className={
                          m.days_remaining < 0
                            ? "font-medium text-destructive"
                            : "font-medium text-amber-600"
                        }
                      >
                        {m.days_remaining < 0
                          ? `${Math.abs(m.days_remaining)}d overdue`
                          : `${m.days_remaining}d left`}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {disciplineLabels[m.discipline]}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
