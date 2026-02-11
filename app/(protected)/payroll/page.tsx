"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronRight, FileText, ShieldAlert, Mail } from "lucide-react";
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

interface ClientWeekGroup {
  client: string;
  batchId?: string | null;
  minimumBillableHours: number;
  drivers: {
    name: string;
    actualHours: number;
    billableHours: number;
    daysWorked: number;
    rating?: number;
    approvedAt?: Date | null;
    approvedBy?: string | null;
    batchId?: string | null;
    hasModifications?: boolean;
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

export default function PayrollPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [payrollEmail, setPayrollEmail] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const { data: timesheets, isLoading: timesheetsLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Helper functions - ported from legacy code
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
    mutationFn: async (email: string) => {
      const response = await fetch("/api/payroll/send", {
        method: "POST",
        body: JSON.stringify({ email }),
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
    sendEmailMutation.mutate(payrollEmail);
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

      const days = [
        { client: timesheet.sundayClient, total: timesheet.sundayTotal },
        { client: timesheet.mondayClient, total: timesheet.mondayTotal },
        { client: timesheet.tuesdayClient, total: timesheet.tuesdayTotal },
        { client: timesheet.wednesdayClient, total: timesheet.wednesdayTotal },
        { client: timesheet.thursdayClient, total: timesheet.thursdayTotal },
        { client: timesheet.fridayClient, total: timesheet.fridayTotal },
        { client: timesheet.saturdayClient, total: timesheet.saturdayTotal },
      ];

      const clientData = new Map<string, { actualHours: number; daysWorked: number }>();
      
      days.forEach(day => {
        if (day.client && day.client.trim()) {
          const hours = parseFloat(day.total || "0");
          if (hours > 0) {
            const existing = clientData.get(day.client) || { actualHours: 0, daysWorked: 0 };
            existing.actualHours += hours;
            existing.daysWorked += 1;
            clientData.set(day.client, existing);
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
          actualHours: data.actualHours,
          billableHours: billableHours,
          daysWorked: data.daysWorked,
          rating: timesheet.clientRating || undefined,
          approvedAt: timesheet.clientApprovedAt,
          approvedBy: timesheet.clientApprovedBy,
          batchId: timesheet.batchId,
          hasModifications: !!(timesheet.clientModifications && Object.keys(timesheet.clientModifications as object).length > 0),
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

  if (authLoading || timesheetsLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl space-y-4">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  // Admin access check (assuming 'admin' or 'super_admin' roles)
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Payroll Report</DialogTitle>
                <DialogDescription>
                  Enter the email address to send the complete payroll report with batch confirmations
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                <Button 
                  onClick={handleSendEmail} 
                  disabled={sendEmailMutation.isPending}
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
