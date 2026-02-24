import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberWithStatus, Currency } from "@/lib/types";
import { formatCurrency } from "@/lib/member-utils";
import { DollarSign } from "lucide-react";

interface RevenueCardProps {
  members: MemberWithStatus[];
}

export function RevenueCard({ members }: RevenueCardProps) {
  const activeMembers = members.filter(
    (m) => m.status === "active" || m.status === "expiring"
  );

  const revenueByCurrency = activeMembers.reduce(
    (acc, m) => {
      const cur = m.currency || "USD";
      acc[cur] = (acc[cur] || 0) + m.monthly_fee;
      return acc;
    },
    {} as Record<Currency, number>
  );

  const currencies = Object.entries(revenueByCurrency) as [Currency, number][];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currencies.length === 0 ? (
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-accent/20 p-2">
              <DollarSign className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              <p className="text-xl font-bold text-foreground">$0.00</p>
            </div>
          </div>
        ) : (
          currencies.map(([cur, amount]) => (
            <div key={cur} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-accent/20 p-2">
                  <span className="text-sm font-bold text-accent-foreground">
                    {cur === "CRC" ? "\u20A1" : "$"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Monthly ({cur})
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(amount, cur)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active subscribers</span>
            <span className="font-medium text-foreground">
              {activeMembers.length}
            </span>
          </div>
          {currencies.map(([cur, amount]) => (
            <div
              key={cur}
              className="mt-2 flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">
                Projected Annual ({cur})
              </span>
              <span className="font-medium text-foreground">
                {formatCurrency(amount * 12, cur)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
