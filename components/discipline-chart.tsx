"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberWithStatus, Discipline, disciplineLabels } from "@/lib/types";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface DisciplineChartProps {
  members: MemberWithStatus[];
}

// Green-to-gold palette matching Coco Gym branding
const COLORS = ["#2d6a4f", "#40916c", "#d4a017", "#b8860b", "#52796f"];

export function DisciplineChart({ members }: DisciplineChartProps) {
  const disciplineCounts = members.reduce(
    (acc, member) => {
      acc[member.discipline] = (acc[member.discipline] || 0) + 1;
      return acc;
    },
    {} as Record<Discipline, number>
  );

  const data = (
    Object.entries(disciplineCounts) as [Discipline, number][]
  ).map(([discipline, count]) => ({
    name: disciplineLabels[discipline],
    value: count,
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members by Discipline</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Members by Discipline</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e5e5",
                borderRadius: "6px",
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconSize={10}
              formatter={(value) => (
                <span className="text-xs text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
