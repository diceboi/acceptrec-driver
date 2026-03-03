"use client";

import TimesheetForm from "@/components/timesheet/form";
import TimesheetTable from "@/components/timesheet/table";
import { useQuery } from "@tanstack/react-query";
import { Timesheet } from "@/shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, List, CheckCircle, XCircle, X, Search } from "lucide-react";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";


type FilterStatus = "pending_approval" | "approved" | "rejected" | "draft" | null;

export default function TimesheetsPage() {
  const searchParams = useSearchParams();
  const { data: timesheets = [], isLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
  });

  const initialFilter = (searchParams.get("filter") as FilterStatus) ?? null;
  const [activeFilter, setActiveFilter] = useState<FilterStatus>(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Sync filter if URL param changes (e.g. browser back/forward)
  useEffect(() => {
    setActiveFilter((searchParams.get("filter") as FilterStatus) ?? null);
  }, [searchParams]);

  // Apply both status filter and text search
  const baseFiltered = activeFilter
    ? timesheets.filter(t => t.approvalStatus === activeFilter)
    : timesheets;

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  const filteredTimesheets = searchQuery.trim()
    ? baseFiltered.filter(t => {
      const q = searchQuery.toLowerCase();
      return (
        (t.driverName ?? "").toLowerCase().includes(q) ||
        (t.weekStartDate ?? "").toLowerCase().includes(q)
      );
    })
    : baseFiltered;

  const totalPages = Math.ceil(filteredTimesheets.length / itemsPerPage);
  const paginatedTimesheets = filteredTimesheets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );



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
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by driver name or week…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

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
              <TimesheetTable timesheets={paginatedTimesheets} isLoading={isLoading} />
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTimesheets.length)} of {filteredTimesheets.length} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="text-sm font-medium px-2">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
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
