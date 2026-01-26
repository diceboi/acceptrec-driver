
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  isLoading?: boolean;
  "data-testid"?: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  isLoading = false,
  "data-testid": testId,
}: StatsCardProps) {
  return (
    <Card className="hover-elevate" data-testid={testId}>
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
      </CardContent>
    </Card>
  );
}
