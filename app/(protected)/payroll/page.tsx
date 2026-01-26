'use client';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronRight, FileText, ShieldAlert, PenLine } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    approvedAt?: string;
    approvedBy?: string;
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
  const { user } = useAuth();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: weekGroups = [], isLoading } = useQuery<WeekGroup[]>({
    queryKey: ["/api/payroll"],
  });

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

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

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
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-payroll">
            <FileText className="w-8 h-8" />
            Payroll Export
          </h1>
          <p className="text-muted-foreground mt-1">
            Approved timesheets grouped by client and week for payroll processing
          </p>
        </div>
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
                      className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-md -m-2 p-2 transition-colors"
                      onClick={() => toggleRow(weekKey)}
                      data-testid={`row-week-${weekKey}`}
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
                          <TableHead>Min. Hours</TableHead>
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
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => toggleRow(clientKey)}
                                data-testid={`row-client-${clientKey}`}
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
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {client.minimumBillableHours}h/day
                                  </Badge>
                                </TableCell>
                              </TableRow>
                              
                              {isClientExpanded && (
                                <TableRow key={`${clientKey}-details`}>
                                  <TableCell colSpan={5} className="bg-muted/50 p-0">
                                    <div className="p-4">
                                      <h4 className="text-sm font-semibold mb-3">Driver Hours</h4>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Driver Name</TableHead>
                                            <TableHead className="text-right">Actual</TableHead>
                                            <TableHead className="text-right">Billable</TableHead>
                                            <TableHead className="text-right">Days</TableHead>
                                            <TableHead className="text-right">Rating</TableHead>
                                            <TableHead>Approved By</TableHead>
                                            <TableHead className="text-right">Approved Date</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {client.drivers.map((driver, idx) => (
                                            <TableRow key={`${driver.name}-${idx}`}>
                                              <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                  {driver.name}
                                                  {driver.hasModifications && (
                                                    <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600 text-xs">
                                                      <PenLine className="w-3 h-3" />
                                                      Edited
                                                    </Badge>
                                                  )}
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {driver.actualHours.toFixed(2)}h
                                              </TableCell>
                                              <TableCell className="text-right font-semibold">
                                                {driver.billableHours.toFixed(2)}h
                                                {driver.billableHours > driver.actualHours && (
                                                  <Badge variant="secondary" className="ml-1 text-xs">
                                                    +{(driver.billableHours - driver.actualHours).toFixed(2)}
                                                  </Badge>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-right text-muted-foreground">
                                                {driver.daysWorked}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {driver.rating ? (
                                                  <Badge variant="outline">
                                                    {driver.rating}/10
                                                  </Badge>
                                                ) : (
                                                  <span className="text-muted-foreground">—</span>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-sm">
                                                {driver.approvedBy || (
                                                  <span className="text-muted-foreground">—</span>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-right text-sm text-muted-foreground">
                                                {driver.approvedAt
                                                  ? format(parseISO(driver.approvedAt), "MMM d, yyyy")
                                                  : "—"}
                                              </TableCell>
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
