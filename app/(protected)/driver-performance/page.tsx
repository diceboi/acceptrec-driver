'use client';

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Star, MessageSquare, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Timesheet {
  id: string;
  driverName: string;
  weekStartDate: string;
  clientRating?: number;
  clientComments?: string;
  clientApprovedBy?: string;
  clientApprovedAt?: string;
  approvalStatus: string;
}

export default function DriverPerformance() {
  const { user } = useAuth();
  const [selectedDriver, setSelectedDriver] = useState<string>("all");

  const { data: timesheets = [], isLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
  });

  // Get only approved timesheets with ratings
  const approvedTimesheets = useMemo(() => {
    return timesheets.filter(
      t => t.approvalStatus === "approved" && t.clientRating
    );
  }, [timesheets]);

  // Get unique drivers
  const drivers = useMemo(() => {
    const uniqueDrivers = Array.from(new Set(approvedTimesheets.map(t => t.driverName)));
    return uniqueDrivers.sort();
  }, [approvedTimesheets]);

  // Filter timesheets by selected driver
  const filteredTimesheets = useMemo(() => {
    if (selectedDriver === "all") return approvedTimesheets;
    return approvedTimesheets.filter(t => t.driverName === selectedDriver);
  }, [approvedTimesheets, selectedDriver]);

  // Calculate stats per driver
  const driverStats = useMemo(() => {
    const stats = new Map<string, { totalReviews: number; avgRating: number; ratings: number[] }>();
    
    approvedTimesheets.forEach(t => {
      if (!stats.has(t.driverName)) {
        stats.set(t.driverName, { totalReviews: 0, avgRating: 0, ratings: [] });
      }
      const driverStat = stats.get(t.driverName)!;
      driverStat.totalReviews++;
      driverStat.ratings.push(t.clientRating!);
    });

    // Calculate averages
    stats.forEach((stat) => {
      const sum = stat.ratings.reduce((a, b) => a + b, 0);
      stat.avgRating = sum / stat.ratings.length;
    });

    return stats;
  }, [approvedTimesheets]);

  const role = user?.user_metadata?.role;

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (role !== "admin" && role !== "super_admin") {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const selectedDriverStats = selectedDriver !== "all" ? driverStats.get(selectedDriver) : null;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-driver-performance">
          <Star className="w-8 h-8" />
          Driver Performance
        </h1>
        <p className="text-muted-foreground mt-1">
          View client reviews and ratings for each driver
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reviews">Detailed Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Driver Ratings Summary</CardTitle>
              <CardDescription>Average ratings and review counts</CardDescription>
            </CardHeader>
            <CardContent>
              {drivers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {drivers.map(driver => {
                    const stats = driverStats.get(driver)!;
                    return (
                      <div key={driver} className="flex items-center justify-between p-4 border rounded hover:bg-accent/50 transition-colors">
                        <div className="flex-1">
                          <p className="font-semibold">{driver}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              {stats.totalReviews} reviews
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-2xl font-bold flex items-center gap-1">
                              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                              {stats.avgRating.toFixed(1)}
                            </p>
                            <p className="text-xs text-muted-foreground">avg rating</p>
                          </div>
                          <Badge variant={stats.avgRating >= 8 ? "default" : stats.avgRating >= 6 ? "secondary" : "destructive"}>
                            {stats.avgRating >= 8 ? "Excellent" : stats.avgRating >= 6 ? "Good" : "Needs Improvement"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <div className="flex items-center gap-4">
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="w-64" data-testid="select-driver">
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drivers</SelectItem>
                {drivers.map(driver => (
                  <SelectItem key={driver} value={driver}>{driver}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedDriverStats && (
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-base">
                  <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                  {selectedDriverStats.avgRating.toFixed(1)} average
                </Badge>
                <Badge variant="secondary">
                  {selectedDriverStats.totalReviews} reviews
                </Badge>
              </div>
            )}
          </div>

          {filteredTimesheets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No reviews found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTimesheets.map(timesheet => (
                <Card key={timesheet.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{timesheet.driverName}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4" />
                          Week of {format(parseISO(timesheet.weekStartDate), 'MMM d, yyyy')}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span className="text-2xl font-bold">{timesheet.clientRating}</span>
                          <span className="text-muted-foreground">/10</span>
                        </div>
                        <Badge variant={
                          timesheet.clientRating! >= 8 ? "default" : 
                          timesheet.clientRating! >= 6 ? "secondary" : 
                          "destructive"
                        }>
                          {timesheet.clientRating! >= 8 ? "Excellent" : 
                           timesheet.clientRating! >= 6 ? "Good" : 
                           timesheet.clientRating! >= 4 ? "Fair" : "Poor"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  {timesheet.clientComments && (
                    <CardContent>
                      <div className="bg-muted/50 rounded p-3">
                        <p className="text-sm font-medium mb-1">Client Feedback:</p>
                        <p className="text-sm text-muted-foreground">{timesheet.clientComments}</p>
                        {timesheet.clientApprovedBy && (
                          <p className="text-xs text-muted-foreground mt-2">
                            — {timesheet.clientApprovedBy}
                            {timesheet.clientApprovedAt && (
                              <span className="ml-2">
                                on {format(parseISO(timesheet.clientApprovedAt), 'MMM d, yyyy')}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
