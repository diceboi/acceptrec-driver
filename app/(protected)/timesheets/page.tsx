"use client";

import TimesheetForm from "@/components/timesheet/form";
import TimesheetTable from "@/components/timesheet/table";
import { useQuery } from "@tanstack/react-query";
import { Timesheet } from "@/shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, List, CheckCircle, XCircle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";


type FilterStatus = "pending_approval" | "approved" | "rejected" | "draft" | null;

export default function TimesheetsPage() {
  const searchParams = useSearchParams();
  const { data: timesheets = [], isLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
  });

  const initialFilter = (searchParams.get("filter") as FilterStatus) ?? null;
  const [activeFilter, setActiveFilter] = useState<FilterStatus>(initialFilter);

  // Sync filter if URL param changes (e.g. browser back/forward)
  useEffect(() => {
    setActiveFilter((searchParams.get("filter") as FilterStatus) ?? null);
  }, [searchParams]);

  const filteredTimesheets = activeFilter
    ? timesheets.filter(t => t.approvalStatus === activeFilter)
    : timesheets;

  const toggleFilter = (status: FilterStatus) => {
    setActiveFilter(prev => (prev === status ? null : status));
  };

  const filterCards = [
    {
      label: "Total Entries",
      status: null as FilterStatus,
      count: timesheets.length,
      icon: <List className="h-4 w-4 text-muted-foreground" />,
      activeClass: "ring-2 ring-primary",
    },
    {
      label: "Pending Approval",
      status: "pending_approval" as FilterStatus,
      count: timesheets.filter(t => t.approvalStatus === "pending_approval").length,
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
      activeClass: "ring-2 ring-yellow-500",
    },
    {
      label: "Approved",
      status: "approved" as FilterStatus,
      count: timesheets.filter(t => t.approvalStatus === "approved").length,
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      activeClass: "ring-2 ring-green-500",
    },
    {
      label: "Rejected",
      status: "rejected" as FilterStatus,
      count: timesheets.filter(t => t.approvalStatus === "rejected").length,
      icon: <XCircle className="h-4 w-4 text-destructive" />,
      activeClass: "ring-2 ring-destructive",
    },
    {
      label: "Drafts",
      status: "draft" as FilterStatus,
      count: timesheets.filter(t => t.approvalStatus === "draft").length,
      icon: <List className="h-4 w-4 text-muted-foreground" />,
      activeClass: "ring-2 ring-primary",
    },
  ];

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Timesheets</h1>
        <p className="text-muted-foreground">
          Manage your weekly timesheets and track your hours.
        </p>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <List className="w-4 h-4" />
            My Timesheets
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-2">
            <Plus className="w-4 h-4" />
            New Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {filterCards.map((card) => (
              <Card
                key={card.label}
                onClick={() => toggleFilter(card.status)}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md hover:bg-accent/40",
                  activeFilter === card.status && card.status !== null && card.activeClass,
                )}
                data-testid={`filter-card-${card.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                  {card.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.count}</div>
                  {activeFilter === card.status && card.status !== null && (
                    <p className="text-xs text-muted-foreground mt-1">Click to clear filter</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Timesheet History</CardTitle>
                <CardDescription>
                  View and manage your past submissions
                </CardDescription>
              </div>
              {activeFilter && (
                <Badge
                  variant="secondary"
                  className="gap-1 cursor-pointer"
                  onClick={() => setActiveFilter(null)}
                >
                  <X className="w-3 h-3" />
                  {filterCards.find(c => c.status === activeFilter)?.label}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <TimesheetTable timesheets={filteredTimesheets} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>Submit Weekly Timesheet</CardTitle>
              <CardDescription>
                Enter your hours for the week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimesheetForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
