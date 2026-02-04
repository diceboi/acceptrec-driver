"use client";

import { useState } from "react";
import { Timesheet } from "@/shared/schema";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2, Clock, ArrowUpDown, CheckCircle, XCircle, Lock, PenLine, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import EditDialog from "./edit-dialog";
import DeleteDialog from "./delete-dialog";

interface TimesheetTableProps {
  timesheets: Timesheet[];
  isLoading?: boolean;
}

type SortField = "weekStartDate" | "driverName" | "totalHours";
type SortOrder = "asc" | "desc";

export default function TimesheetTable({ timesheets, isLoading = false }: TimesheetTableProps) {
  const { user, effectiveRole } = useAuth();
  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
  const [deletingTimesheet, setDeletingTimesheet] = useState<Timesheet | null>(null);
  const [sortField, setSortField] = useState<SortField>("weekStartDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Calculate total hours for a timesheet
  const getTotalHours = (timesheet: Timesheet) => {
    return [
      parseFloat(timesheet.mondayTotal || "0"),
      parseFloat(timesheet.tuesdayTotal || "0"),
      parseFloat(timesheet.wednesdayTotal || "0"),
      parseFloat(timesheet.thursdayTotal || "0"),
      parseFloat(timesheet.fridayTotal || "0"),
      parseFloat(timesheet.saturdayTotal || "0"),
      parseFloat(timesheet.sundayTotal || "0"),
    ].reduce((sum, hours) => sum + hours, 0);
  };

  // Get all unique clients for a timesheet
  const getClients = (timesheet: Timesheet): string[] => {
    const clients = [
      timesheet.mondayClient,
      timesheet.tuesdayClient,
      timesheet.wednesdayClient,
      timesheet.thursdayClient,
      timesheet.fridayClient,
      timesheet.saturdayClient,
      timesheet.sundayClient,
    ].filter(client => client && client.trim() !== "");
    return Array.from(new Set(clients));
  };

  // Count night outs for a timesheet
  const getNightOutCount = (timesheet: Timesheet): number => {
    const nightOuts = [
      timesheet.mondayNightOut,
      timesheet.tuesdayNightOut,
      timesheet.wednesdayNightOut,
      timesheet.thursdayNightOut,
      timesheet.fridayNightOut,
      timesheet.saturdayNightOut,
      timesheet.sundayNightOut,
    ].filter(nightOut => nightOut === "true");
    return nightOuts.length;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedTimesheets = [...timesheets].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === "weekStartDate") {
      comparison = new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime();
    } else if (sortField === "totalHours") {
      comparison = getTotalHours(a) - getTotalHours(b);
    } else if (sortField === "driverName") {
      comparison = a.driverName.localeCompare(b.driverName);
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (timesheets.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
        <h3 className="text-lg font-medium text-foreground mb-2">No timesheets found</h3>
        <p className="text-muted-foreground text-sm">
          Start tracking by submitting your first timesheet
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleSort("weekStartDate")}
                  data-testid="button-sort-week"
                >
                  Week
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleSort("driverName")}
                  data-testid="button-sort-driver"
                >
                  Driver
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell">Clients</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleSort("totalHours")}
                  data-testid="button-sort-hours"
                >
                  Total Hours
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="hidden lg:table-cell">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTimesheets.map((timesheet, index) => {
              const clients = getClients(timesheet);
              const totalHours = getTotalHours(timesheet);
              const nightOutCount = getNightOutCount(timesheet);
              
              return (
                <TableRow
                  key={timesheet.id}
                  className="hover:bg-muted/50"
                  data-testid={`row-timesheet-${index}`}
                >
                  <TableCell className="font-medium">
                    {format(parseISO(timesheet.weekStartDate), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">{timesheet.driverName}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {clients.length > 0 ? (
                        clients.map((client, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {client}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No clients</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary tabular-nums">
                        {totalHours.toFixed(2)}h
                      </span>
                      {nightOutCount > 0 && (
                        <Badge variant="outline" className="gap-1 text-xs border-blue-500 text-blue-600">
                          <Moon className="w-3 h-3" />
                          {nightOutCount}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      {timesheet.approvalStatus === "approved" ? (
                        <Badge className="gap-1 bg-green-500 hover:bg-green-600">
                          <CheckCircle className="w-3 h-3" />
                          Approved
                        </Badge>
                      ) : timesheet.approvalStatus === "rejected" ? (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </Badge>
                      ) : timesheet.approvalStatus === "pending_approval" ? (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="w-3 h-3" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="outline">Draft</Badge>
                      )}
                      
                      <TooltipProvider>
                      {timesheet.batchId && effectiveRole === 'driver' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Sent to client - contact admin to edit</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {!!timesheet.clientModifications && Object.keys(timesheet.clientModifications as Record<string, unknown>).length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                              <PenLine className="w-3 h-3" />
                              Edited
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Client made edits before approval</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {timesheet.batchId && effectiveRole === 'driver' ? (
                        <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={true}
                                data-testid={`button-edit-${index}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This timesheet has been sent to a client and cannot be edited</p>
                          </TooltipContent>
                        </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTimesheet(timesheet)}
                          data-testid={`button-edit-${index}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingTimesheet(timesheet)}
                        data-testid={`button-delete-${index}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <p data-testid="text-total-entries">
          Total entries: <span className="font-medium text-foreground">{timesheets.length}</span>
        </p>
        <p data-testid="text-total-hours">
          Total hours:{" "}
          <span className="font-semibold text-primary tabular-nums">
            {timesheets.reduce((sum, t) => sum + getTotalHours(t), 0).toFixed(2)}h
          </span>
        </p>
      </div>

      {editingTimesheet && (
        <EditDialog
          timesheet={editingTimesheet}
          open={!!editingTimesheet}
          onOpenChange={(open) => !open && setEditingTimesheet(null)}
        />
      )}

      {deletingTimesheet && (
        <DeleteDialog
          timesheet={deletingTimesheet}
          open={!!deletingTimesheet}
          onOpenChange={(open) => !open && setDeletingTimesheet(null)}
        />
      )}
    </>
  );
}
