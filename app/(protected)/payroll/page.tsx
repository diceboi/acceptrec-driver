"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronRight, FileText, ShieldAlert, Mail, Layers } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { BatchConfirmationModal } from "@/components/payroll/BatchConfirmationModal";
import { SendBatchEmail } from "@/components/payroll/SendBatchEmail";
import { Timesheet, Client } from "@/shared/schema";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DriverClass {
  id: string;
  name: string;
}

interface ClassRate {
  id: string;
  driverClassId: string;
  clientId: string;
  hourlyRate: number;
  saturdayRate: number;
  sundayRate: number;
  holidayRate: number;
  clientName: string;
}

interface ClientWeekGroup {
  client: string;
  batchId?: string | null;
  minimumBillableHours: number;
  drivers: {
    name: string;
    timesheetId: string;
    actualHours: number;
    billableHours: number;
    daysWorked: number;
    rating?: number;
    approvedAt?: Date | null;
    approvedBy?: string | null;
    batchId?: string | null;
    hasModifications?: boolean;
    dayDetails: {
      day: string;
      dayLabel: string;
      client: string;
      hours: number;
      isHoliday: boolean;
    }[];
  }[];
  totalActualHours: number;
  totalBillableHours: number;
}

interface WeekGroup {
  weekStartDate: string;
  clients: ClientWeekGroup[];
  totalActualHours: number;
  totalBillableHours: number;
  driverCount: number;
}

// Class assignments: timesheetId -> day -> classId
type ClassAssignments = Record<string, Record<string, string>>;

export default function PayrollPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedExportWeek, setSelectedExportWeek] = useState<string>("all");
  const [selectedExportClient, setSelectedExportClient] = useState<string>("all");
  const [payrollEmail, setPayrollEmail] = useState("");
  const [chargeRate, setChargeRate] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());

  const { data: timesheets, isLoading: timesheetsLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Extract class assignments from timesheets
  const classAssignments = useMemo(() => {
    const assignments: ClassAssignments = {};
    if (!timesheets) return assignments;
    
    for (const ts of timesheets) {
      if ((ts as any).driverClassesByDay) {
        assignments[ts.id] = (ts as any).driverClassesByDay;
      }
    }
    return assignments;
  }, [timesheets]);

  const { data: driverClasses = [] } = useQuery<DriverClass[]>({
    queryKey: ["/api/driver-classes"],
  });

  // Fetch all class rates across all classes
  const { data: allClassRates = [] } = useQuery<ClassRate[]>({
    queryKey: ["/api/driver-classes/all-rates"],
    queryFn: async () => {
      // Fetch rates for each class
      const allRates: ClassRate[] = [];
      for (const dc of driverClasses) {
        const res = await fetch(`/api/driver-classes/${dc.id}/rates`, { credentials: 'include' });
        if (res.ok) {
          const rates = await res.json();
          allRates.push(...rates);
        }
      }
      return allRates;
    },
    enabled: driverClasses.length > 0,
  });

  // Helper: get rate for a class + client combo
  const getClassRate = (classId: string, clientName: string, day: string = 'weekday', isHoliday: boolean = false): number | null => {
    if (!clients) return null;
    // Find the client ID from name
    const normalizedName = normalizeClientName(clientName);
    const matchedClient = clients.find(c => normalizeClientName(c.companyName) === normalizedName);
    if (!matchedClient) return null;

    const rate = allClassRates.find(r => r.driverClassId === classId && r.clientId === matchedClient.id);
    if (!rate) return null;
    
    if (isHoliday && rate.holidayRate > 0) return rate.holidayRate;
    if (day === 'saturday' && rate.saturdayRate > 0) return rate.saturdayRate;
    if (day === 'sunday' && rate.sundayRate > 0) return rate.sundayRate;
    
    return rate.hourlyRate;
  };

  // Helper: get class name by ID
  const getClassName = (classId: string): string => {
    return driverClasses.find(dc => dc.id === classId)?.name ?? "";
  };

  // Helper functions
  const normalizeClientName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[.,&'"()[\]{}]/g, ' ')
      .replace(/\band\b/g, ' ')
      .replace(/\b(inc|incorporated|ltd|limited|llc|corp|corporation|co|company|plc)\b/g, '')
      .replace(/^(the|a|aa)\s+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getNameMatchScore = (name1: string, name2: string): number => {
    if (name1 === name2) return 1.0;
    const words1 = name1.split(/\s+/).filter(w => w.length > 1);
    const words2 = name2.split(/\s+/).filter(w => w.length > 1);
    if (words1.length === 0 || words2.length === 0) return 0;
    if (words1[0] !== words2[0]) return 0;
    const matchingWords = words1.filter(w => words2.includes(w));
    return matchingWords.length / Math.max(words1.length, words2.length);
  };

  const getClientMinimumHours = (clientName: string): number => {
    if (!clients) return 8;
    const normalizedName = normalizeClientName(clientName);
    
    let matchingClient = clients.find(c => 
      normalizeClientName(c.companyName) === normalizedName
    );
    
    if (!matchingClient) {
      let bestMatch: Client | undefined;
      let bestScore = 0;
      for (const client of clients) {
        const clientNorm = normalizeClientName(client.companyName);
        const score = getNameMatchScore(normalizedName, clientNorm);
        if (score > bestScore && score > 0.5) {
          bestScore = score;
          bestMatch = client;
        }
      }
      matchingClient = bestMatch;
    }
    return matchingClient?.minimumBillableHours ?? 8;
  };

  const sendEmailMutation = useMutation({
    mutationFn: async ({ email, rate, weekStartDate, clientId }: { email: string, rate: string, weekStartDate: string, clientId: string }) => {
      const response = await fetch("/api/payroll/send", {
        method: "POST",
        body: JSON.stringify({ 
          email, 
          fallbackChargeRate: rate, 
          weekStartDate: weekStartDate !== "all" ? weekStartDate : undefined,
          clientId: clientId !== "all" ? clientId : undefined
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to send email");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Payroll report has been sent successfully.");
      setEmailDialogOpen(false);
      setPayrollEmail("");
      setChargeRate("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSendEmail = () => {
    if (!payrollEmail || !payrollEmail.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!chargeRate || isNaN(parseFloat(chargeRate))) {
      toast.error("Please enter a valid fallback charge rate");
      return;
    }
    sendEmailMutation.mutate({ 
      email: payrollEmail, 
      rate: chargeRate, 
      weekStartDate: selectedExportWeek,
      clientId: selectedExportClient 
    });
  };

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const toggleDriverExpanded = (key: string) => {
    setExpandedDrivers(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getWeekGroups = (): WeekGroup[] => {
    if (!timesheets) return [];

    const approvedTimesheets = timesheets.filter(
      t => t.approvalStatus === "approved"
    );

    const weeks = new Map<string, WeekGroup>();

    approvedTimesheets.forEach(timesheet => {
      const weekStart = timesheet.weekStartDate;
      
      if (!weeks.has(weekStart)) {
        weeks.set(weekStart, {
          weekStartDate: weekStart,
          clients: [],
          totalActualHours: 0,
          totalBillableHours: 0,
          driverCount: 0,
        });
      }

      const week = weeks.get(weekStart)!;

      const ts = timesheet as any;
      const days = [
        { day: "sunday", dayLabel: "Sun", client: ts.sundayClient, total: ts.sundayTotal, isHoliday: ts.sundayIsHoliday },
        { day: "monday", dayLabel: "Mon", client: ts.mondayClient, total: ts.mondayTotal, isHoliday: ts.mondayIsHoliday },
        { day: "tuesday", dayLabel: "Tue", client: ts.tuesdayClient, total: ts.tuesdayTotal, isHoliday: ts.tuesdayIsHoliday },
        { day: "wednesday", dayLabel: "Wed", client: ts.wednesdayClient, total: ts.wednesdayTotal, isHoliday: ts.wednesdayIsHoliday },
        { day: "thursday", dayLabel: "Thu", client: ts.thursdayClient, total: ts.thursdayTotal, isHoliday: ts.thursdayIsHoliday },
        { day: "friday", dayLabel: "Fri", client: ts.fridayClient, total: ts.fridayTotal, isHoliday: ts.fridayIsHoliday },
        { day: "saturday", dayLabel: "Sat", client: ts.saturdayClient, total: ts.saturdayTotal, isHoliday: ts.saturdayIsHoliday },
      ];

      const clientData = new Map<string, { actualHours: number; daysWorked: number; dayDetails: { day: string; dayLabel: string; client: string; hours: number; isHoliday: boolean }[] }>();
      
      days.forEach(dayInfo => {
        if (dayInfo.client && dayInfo.client.trim()) {
          const hours = parseFloat(dayInfo.total || "0");
          if (hours > 0) {
            const existing = clientData.get(dayInfo.client) || { actualHours: 0, daysWorked: 0, dayDetails: [] };
            existing.actualHours += hours;
            existing.daysWorked += 1;
            existing.dayDetails.push({ day: dayInfo.day, dayLabel: dayInfo.dayLabel, client: dayInfo.client, hours, isHoliday: dayInfo.isHoliday });
            clientData.set(dayInfo.client, existing);
          }
        }
      });

      clientData.forEach((data, client) => {
        let clientGroup = week.clients.find(c => c.client === client);
        const minimumHours = getClientMinimumHours(client);
        
        if (!clientGroup) {
          clientGroup = {
            client,
            batchId: timesheet.batchId,
            minimumBillableHours: minimumHours,
            drivers: [],
            totalActualHours: 0,
            totalBillableHours: 0,
          };
          week.clients.push(clientGroup);
        }

        if (timesheet.batchId && !clientGroup.batchId) {
          clientGroup.batchId = timesheet.batchId;
        }

        const billableHours = Math.max(data.actualHours, data.daysWorked * minimumHours);

        clientGroup.drivers.push({
          name: timesheet.driverName,
          timesheetId: timesheet.id,
          actualHours: data.actualHours,
          billableHours: billableHours,
          daysWorked: data.daysWorked,
          rating: timesheet.clientRating || undefined,
          approvedAt: timesheet.clientApprovedAt,
          approvedBy: timesheet.clientApprovedBy,
          batchId: timesheet.batchId,
          hasModifications: !!(timesheet.clientModifications && Object.keys(timesheet.clientModifications as object).length > 0),
          dayDetails: data.dayDetails,
        });
        clientGroup.totalActualHours += data.actualHours;
        clientGroup.totalBillableHours += billableHours;
        week.totalActualHours += data.actualHours;
        week.totalBillableHours += billableHours;
      });
    });

    weeks.forEach(week => {
      const uniqueDrivers = new Set<string>();
      week.clients.forEach(client => {
        client.drivers.forEach(driver => uniqueDrivers.add(driver.name));
      });
      week.driverCount = uniqueDrivers.size;
      week.clients.sort((a, b) => a.client.localeCompare(b.client));
    });

    return Array.from(weeks.values())
      .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  };

  const weekGroups = getWeekGroups();

  // Count how many day-class assignments have been made
  const totalAssignments = useMemo(() => {
    let count = 0;
    Object.values(classAssignments).forEach(days => {
      Object.values(days).forEach(classId => {
        if (classId) count++;
      });
    });
    return count;
  }, [classAssignments]);

  if (authLoading || timesheetsLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl space-y-4">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  const userRole = user?.user_metadata?.role;
  if (userRole !== "admin" && userRole !== "super_admin") {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">Admin Access Required</h2>
              <p className="text-muted-foreground">
                You need administrator privileges to view payroll information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Payroll Export
          </h1>
          <p className="text-muted-foreground mt-1">
            Approved timesheets grouped by client and week for payroll processing
          </p>
        </div>
        
        {weekGroups.length > 0 && (
          <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="w-4 h-4 mr-2" />
                Send to Payroll
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] grid-rows-none! flex flex-col overflow-hidden">
              <DialogHeader className="shrink-0">
                <DialogTitle>Send Payroll Report</DialogTitle>
                <DialogDescription>
                  Assign driver classes per day to set hourly rates, then send the report.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
                <div className="space-y-6 pb-4">
                  {/* Export filters row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="export-week">Export Week</Label>
                      <Select value={selectedExportWeek} onValueChange={setSelectedExportWeek}>
                        <SelectTrigger id="export-week">
                          <SelectValue placeholder="All Weeks" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Weeks</SelectItem>
                          {weekGroups.map(week => (
                            <SelectItem key={week.weekStartDate} value={week.weekStartDate}>
                              Week of {format(parseISO(week.weekStartDate), "MMMM d, yyyy")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Select the week to export</p>
                    </div>
                    <div>
                      <Label htmlFor="export-client">Export Client</Label>
                      <Select value={selectedExportClient} onValueChange={setSelectedExportClient}>
                        <SelectTrigger id="export-client">
                          <SelectValue placeholder="All Clients" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Clients</SelectItem>
                          {clients?.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Select a specific client to export</p>
                    </div>
                  </div>

                  {/* Email & fallback rate row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="payroll-email">Payroll Email Address</Label>
                      <Input
                        id="payroll-email"
                        type="email"
                        placeholder="payroll@company.com"
                        value={payrollEmail}
                        onChange={(e) => setPayrollEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="charge-rate">Fallback Charge Rate (£/hr)</Label>
                      <Input
                        id="charge-rate"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 15.50"
                        value={chargeRate}
                        onChange={(e) => setChargeRate(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Used when no class is assigned to a day</p>
                    </div>
                  </div>

                  {totalAssignments > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Layers className="w-4 h-4" />
                      <span>{totalAssignments} day-class assignment{totalAssignments !== 1 ? 's' : ''} set</span>
                    </div>
                  )}

                  {/* Per-week, per-client, per-driver class assignment */}
                  {weekGroups.map(week => (
                    <div key={week.weekStartDate} className="border rounded-lg">
                      <div className="px-4 py-3 bg-muted/50 rounded-t-lg">
                        <h3 className="font-semibold">Week of {format(parseISO(week.weekStartDate), "MMM d, yyyy")}</h3>
                        <p className="text-xs text-muted-foreground">{week.driverCount} drivers · {week.clients.length} clients</p>
                      </div>
                      <div className="divide-y">
                        {week.clients.map(client => (
                          <div key={`${week.weekStartDate}-${client.client}`} className="px-4 py-3">
                            <h4 className="font-medium text-sm mb-2">{client.client}</h4>
                            <div className="space-y-2">
                              {client.drivers.map((driver) => {
                                const driverKey = `modal-${driver.timesheetId}-${client.client}`;
                                const isExpanded = expandedDrivers.has(driverKey);
                                
                                return (
                                  <div key={driverKey} className="border rounded-md bg-background">
                                    <div
                                      className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/30"
                                      onClick={() => toggleDriverExpanded(driverKey)}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                                        <span className="text-sm font-medium">{driver.name}</span>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>{driver.daysWorked} day{driver.daysWorked !== 1 ? 's' : ''}</span>
                                        <span>{driver.billableHours.toFixed(1)}h</span>
                                        {/* Show badge if any classes assigned for this driver */}
                                        {driver.dayDetails.some(d => classAssignments[driver.timesheetId]?.[d.day]) && (
                                          <Badge variant="secondary" className="text-xs"><Layers className="w-3 h-3 mr-1" />Class set</Badge>
                                        )}
                                      </div>
                                    </div>
                                    {isExpanded && (
                                      <div className="px-3 pb-3 border-t">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-16 text-xs">Day</TableHead>
                                              <TableHead className="text-xs text-right w-20">Hours</TableHead>
                                              <TableHead className="text-xs w-48">Driver Class</TableHead>
                                              <TableHead className="text-xs text-right w-24">Rate</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {driver.dayDetails.map(dayDetail => {
                                              const assignedClassId = classAssignments[driver.timesheetId]?.[dayDetail.day] || "";
                                              const resolvedRate = assignedClassId ? getClassRate(assignedClassId, client.client, dayDetail.day, dayDetail.isHoliday) : null;
                                              
                                              return (
                                                <TableRow key={dayDetail.day} className="border-0">
                                                  <TableCell className="py-1 text-xs font-medium">{dayDetail.dayLabel}</TableCell>
                                                  <TableCell className="py-1 text-xs text-right">{dayDetail.hours.toFixed(2)}</TableCell>
                                                  <TableCell className="py-1">
                                                    {assignedClassId ? (
                                                      <span className="text-xs">{getClassName(assignedClassId)}</span>
                                                    ) : (
                                                      <span className="text-xs text-muted-foreground">— No class —</span>
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="py-1 text-xs text-right">
                                                    {assignedClassId && resolvedRate !== null ? (
                                                      <span className="text-green-600 font-medium">£{resolvedRate.toFixed(2)}</span>
                                                    ) : assignedClassId ? (
                                                      <span className="text-amber-500 text-xs">No rate</span>
                                                    ) : (
                                                      <span className="text-muted-foreground">—</span>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="shrink-0 pt-4 border-t">
                <Button 
                  onClick={handleSendEmail} 
                  disabled={sendEmailMutation.isPending || !payrollEmail || !payrollEmail.includes('@') || !chargeRate || isNaN(parseFloat(chargeRate))}
                  className="w-full"
                >
                  {sendEmailMutation.isPending ? "Sending..." : "Send Report"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {weekGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No approved timesheets found
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {weekGroups.map(week => {
            const weekKey = week.weekStartDate;
            const isWeekExpanded = expandedRows.has(weekKey);
            
            return (
              <Card key={weekKey}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-md -m-2 p-2 select-none"
                      onClick={() => toggleRow(weekKey)}
                    >
                      {isWeekExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-xl">
                          Week Starting {format(parseISO(week.weekStartDate), "MMMM d, yyyy")}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {week.driverCount} driver{week.driverCount !== 1 ? 's' : ''} · {week.clients.length} client{week.clients.length !== 1 ? 's' : ''} · {week.totalBillableHours.toFixed(2)} billable hours
                          {week.totalBillableHours > week.totalActualHours && (
                            <span className="text-xs ml-1 text-muted-foreground">
                              ({week.totalActualHours.toFixed(2)} actual)
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {isWeekExpanded && (
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-right">Drivers</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead>Confirmation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {week.clients.map(client => {
                          const clientKey = `${weekKey}-${client.client}`;
                          const isClientExpanded = expandedRows.has(clientKey);
                          
                          return (
                            <>
                              <TableRow
                                key={clientKey}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => toggleRow(clientKey)}
                              >
                                <TableCell>
                                  {isClientExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {client.client}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary">
                                    {client.drivers.length}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  <span>{client.totalBillableHours.toFixed(2)}h</span>
                                  {client.totalBillableHours > client.totalActualHours && (
                                    <span className="text-xs ml-1 text-muted-foreground">
                                      ({client.totalActualHours.toFixed(2)} actual)
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  {client.batchId ? (
                                    <div className="flex items-center gap-2">
                                      <BatchConfirmationModal batchId={client.batchId} />
                                      <SendBatchEmail batchId={client.batchId} clientName={client.client} />
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">No batch</span>
                                  )}
                                </TableCell>
                              </TableRow>
                              
                              {isClientExpanded && (
                                <TableRow key={`${clientKey}-details`}>
                                  <TableCell colSpan={5} className="bg-muted/30 p-0">
                                    <div className="p-4">
                                      <h4 className="text-sm font-semibold mb-3">Driver Hours</h4>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Driver Name</TableHead>
                                            <TableHead className="text-right">Actual</TableHead>
                                            <TableHead className="text-right">Billable</TableHead>
                                            <TableHead className="text-right">Shifts</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {client.drivers.map((driver, idx) => (
                                            <TableRow key={idx} className="border-0">
                                              <TableCell>{driver.name}</TableCell>
                                              <TableCell className="text-right">{driver.actualHours.toFixed(2)}</TableCell>
                                              <TableCell className="text-right font-medium">{driver.billableHours.toFixed(2)}</TableCell>
                                              <TableCell className="text-right">{driver.daysWorked}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
