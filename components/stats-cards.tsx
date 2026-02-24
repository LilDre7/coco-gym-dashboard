import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Clock, UserX } from "lucide-react";
import { MemberWithStatus } from "@/lib/types";

interface StatsCardsProps {
  members: MemberWithStatus[];
}

export function StatsCards({ members }: StatsCardsProps) {
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === "active").length;
  const expiringMembers = members.filter((m) => m.status === "expiring").length;
  const expiredMembers = members.filter((m) => m.status === "expired").length;

  const stats = [
    {
      title: "Total Members",
      value: totalMembers,
      icon: Users,
      color: "text-foreground",
      bgColor: "bg-secondary",
    },
    {
      title: "Active",
      value: activeMembers,
      icon: UserCheck,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Expiring Soon",
      value: expiringMembers,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Expired",
      value: expiredMembers,
      icon: UserX,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`rounded-md p-2 ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
