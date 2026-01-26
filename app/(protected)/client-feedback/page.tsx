'use client';

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, addDays } from "date-fns";
import { MessageSquare, TrendingDown, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
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
  mondayClient?: string;
  tuesdayClient?: string;
  wednesdayClient?: string;
  thursdayClient?: string;
  fridayClient?: string;
  saturdayClient?: string;
  sundayClient?: string;
  mondayDriverRating?: number;
  mondayDriverComments?: string;
  tuesdayDriverRating?: number;
  tuesdayDriverComments?: string;
  wednesdayDriverRating?: number;
  wednesdayDriverComments?: string;
  thursdayDriverRating?: number;
  thursdayDriverComments?: string;
  fridayDriverRating?: number;
  fridayDriverComments?: string;
  saturdayDriverRating?: number;
  saturdayDriverComments?: string;
  sundayDriverRating?: number;
  sundayDriverComments?: string;
}

interface DayFeedback {
  day: string;
  client: string;
  rating?: number;
  comments?: string;
  driver: string;
  weekStartDate: string;
  actualDate: string;
  timesheetId: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export default function ClientFeedback() {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState<string>("all");

  const { data: timesheets = [], isLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
  });

  const role = user?.user_metadata?.role;

  // Extract per-day feedback from all timesheets
  const allDayFeedback = useMemo(() => {
    const feedback: DayFeedback[] = [];
    
    timesheets.forEach(ts => {
      DAYS.forEach((day, idx) => {
        const dayLower = day.toLowerCase();
        const client = ts[`${dayLower}Client` as keyof Timesheet] as string;
        const rating = ts[`${dayLower}DriverRating` as keyof Timesheet] as number | undefined;
        const comments = ts[`${dayLower}DriverComments` as keyof Timesheet] as string | undefined;
        
        // Only include if there's a client AND (rating OR comments)
        if (client && client.trim() !== '' && (rating || comments)) {
          const weekStart = parseISO(ts.weekStartDate);
          const actualDate = addDays(weekStart, idx);
          
          feedback.push({
            day,
            client,
            rating,
            comments,
            driver: ts.driverName,
            weekStartDate: ts.weekStartDate,
            actualDate: format(actualDate, 'yyyy-MM-dd'),
            timesheetId: ts.id,
          });
        }
      });
    });
    
    return feedback;
  }, [timesheets]);

  // Get unique client names
  const allClients = useMemo(() => {
    const clientSet = new Set<string>();
    allDayFeedback.forEach(f => clientSet.add(f.client));
    return Array.from(clientSet).sort();
  }, [allDayFeedback]);

  // Filter feedback by client
  const filteredFeedback = useMemo(() => {
    if (selectedClient === "all") return allDayFeedback;
    return allDayFeedback.filter(f => f.client === selectedClient);
  }, [allDayFeedback, selectedClient]);

  // Calculate stats per client
  const clientStats = useMemo(() => {
    const stats = new Map<string, { totalFeedback: number; avgRating: number; ratings: number[] }>();
    
    allDayFeedback.forEach(f => {
      if (!stats.has(f.client)) {
        stats.set(f.client, { totalFeedback: 0, avgRating: 0, ratings: [] });
      }
      const stat = stats.get(f.client)!;
      stat.totalFeedback++;
      if (f.rating) {
        stat.ratings.push(f.rating);
      }
    });

    // Calculate averages
    stats.forEach((stat) => {
      if (stat.ratings.length > 0) {
        const sum = stat.ratings.reduce((a, b) => a + b, 0);
        stat.avgRating = sum / stat.ratings.length;
      }
    });

    return stats;
  }, [allDayFeedback]);

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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-client-feedback">
          <MessageSquare className="w-8 h-8" />
          Client Feedback
        </h1>
        <p className="text-muted-foreground mt-1">
          Private driver feedback about clients (admin-only)
        </p>
      </div>

      <div className="mb-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 rounded-xl border shadow-sm p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">Confidential Information</p>
            <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
              This feedback is provided by drivers and is strictly confidential. Clients never see this information.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-64" data-testid="select-client">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {allClients.map(client => (
                <SelectItem key={client} value={client}>{client}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedClient !== "all" && clientStats.has(selectedClient) && (
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-base">
                {clientStats.get(selectedClient)!.avgRating > 0 
                  ? `${clientStats.get(selectedClient)!.avgRating.toFixed(1)} avg rating`
                  : "No ratings"}
              </Badge>
              <Badge variant="secondary">
                {clientStats.get(selectedClient)!.totalFeedback} feedback entries
              </Badge>
            </div>
          )}
        </div>

        {filteredFeedback.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No driver feedback available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map((feedback, idx) => (
              <Card key={`${feedback.timesheetId}-${feedback.day}-${idx}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {feedback.client}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4" />
                        {feedback.day}, {format(parseISO(feedback.actualDate), 'MMM d, yyyy')}
                      </CardDescription>
                      <div className="mt-2">
                        <Badge variant="outline">Driver: {feedback.driver}</Badge>
                      </div>
                    </div>
                    {feedback.rating && (
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          {feedback.rating >= 7 ? (
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          ) : feedback.rating >= 4 ? (
                            <TrendingUp className="w-5 h-5 text-yellow-500" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-500" />
                          )}
                          <span className="text-2xl font-bold">{feedback.rating}</span>
                          <span className="text-muted-foreground">/10</span>
                        </div>
                        <Badge variant={
                          feedback.rating >= 8 ? "default" : 
                          feedback.rating >= 6 ? "secondary" : 
                          "destructive"
                        }>
                          {feedback.rating >= 8 ? "Great Experience" : 
                           feedback.rating >= 6 ? "Good" : 
                           feedback.rating >= 4 ? "Average" : "Poor Experience"}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>
                {feedback.comments && (
                  <CardContent>
                    <div className="bg-muted/50 rounded p-3">
                      <p className="text-sm font-medium mb-1">Driver's Feedback:</p>
                      <p className="text-sm text-muted-foreground">{feedback.comments}</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
