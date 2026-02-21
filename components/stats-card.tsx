
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  isLoading?: boolean;
  href?: string;
  "data-testid"?: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  isLoading = false,
  href,
  "data-testid": testId,
}: StatsCardProps) {
  const card = (
    <Card
      className={`hover-elevate${href ? " cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all" : ""}`}
      data-testid={testId}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">{title}</p>
            {isLoading ? (
              <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
            ) : (
              <p className="text-2xl font-semibold text-foreground tabular-nums">
                {value}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
        {href && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            View all →
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block">{card}</Link>;
  }

  return card;
}
