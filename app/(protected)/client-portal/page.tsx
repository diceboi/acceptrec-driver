
'use client';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, Building2, Calendar, Star, FileText, ChevronRight, AlertTriangle, Pencil } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Types matching Schema
interface ApprovalBatch {
  id: string;
  clientId: string;
  clientName: string;
  weekStartDate: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
}

interface Timesheet {
  id: string;
  driverId: string;
  driverName: string;
  weekStartDate: string;
  approvalStatus: string;
  clientApprovedAt: string | null;
  clientApprovedBy: string | null;
  clientRating: number;
  clientComments: string | null;
  mondayClient: string | null;
  mondayStart: string | null;
  mondayEnd: string | null;
  mondayBreak: number | null;
  mondayTotal: string | null;
  tuesdayClient: string | null;
  tuesdayStart: string | null;
  tuesdayEnd: string | null;
  tuesdayBreak: number | null;
  tuesdayTotal: string | null;
  wednesdayClient: string | null;
  wednesdayStart: string | null;
  wednesdayEnd: string | null;
  wednesdayBreak: number | null;
  wednesdayTotal: string | null;
  thursdayClient: string | null;
  thursdayStart: string | null;
  thursdayEnd: string | null;
  thursdayBreak: number | null;
  thursdayTotal: string | null;
  fridayClient: string | null;
  fridayStart: string | null;
  fridayEnd: string | null;
  fridayBreak: number | null;
  fridayTotal: string | null;
  saturdayClient: string | null;
  saturdayStart: string | null;
  saturdayEnd: string | null;
  saturdayBreak: number | null;
  saturdayTotal: string | null;
  sundayClient: string | null;
  sundayStart: string | null;
  sundayEnd: string | null;
  sundayBreak: number | null;
  sundayTotal: string | null;
  sundayDisableMinHours: boolean;
  mondayDisableMinHours: boolean;
  tuesdayDisableMinHours: boolean;
  wednesdayDisableMinHours: boolean;
  thursdayDisableMinHours: boolean;
  fridayDisableMinHours: boolean;
  saturdayDisableMinHours: boolean;
}

interface ClientInfo {
  id: string;
  companyName: string;
  contactName: string;
  email: string | null;
  phone: string | null;
}

const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DayKey = typeof days[number];

interface DayEditState {
  start: string;
  end: string;
  break: string;
  total: string;
}

type EditFormState = Record<DayKey, DayEditState>;

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

function calcTotal(start: string, end: string, breakMins: string): string {
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);
  const b = parseInt(breakMins, 10) || 0;
  if (!s && !e) return '0';
  const worked = ((e - s - b) / 60);
  if (worked < 0) return '0';
  return worked.toFixed(2);
}

function buildInitialEditState(timesheet: Timesheet): EditFormState {
  const result = {} as EditFormState;
  for (const day of days) {
    result[day] = {
      start: (timesheet as any)[`${day}Start`] ?? '',
      end: (timesheet as any)[`${day}End`] ?? '',
      break: String((timesheet as any)[`${day}Break`] ?? ''),
      total: (timesheet as any)[`${day}Total`] ?? '0',
    };
  }
  return result;
}

export default function ClientPortal() {
  const { user, viewAsClientId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState<ApprovalBatch | null>(null);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
  const [editFormState, setEditFormState] = useState<EditFormState | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editApproveAfter, setEditApproveAfter] = useState(false);
  const [editRating, setEditRating] = useState(0);

  const { data: clientInfo, isLoading: isLoadingClient } = useQuery<ClientInfo>({
    queryKey: ["/api/client/company", viewAsClientId],
    queryFn: async () => {
      const url = viewAsClientId
        ? `/api/client/company?impersonateClientId=${viewAsClientId}`
        : '/api/client/company';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch client info");
      }
      return response.json();
    },
  });

  const { data: batches, isLoading: isLoadingBatches } = useQuery<ApprovalBatch[]>({
    queryKey: ["/api/client/approval-batches", viewAsClientId],
    queryFn: async () => {
      const url = viewAsClientId
        ? `/api/client/approval-batches?impersonateClientId=${viewAsClientId}`
        : '/api/client/approval-batches';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch batches");
      }
      return response.json();
    },
  });

  const { data: timesheets, isLoading: isLoadingTimesheets } = useQuery<Timesheet[]>({
    queryKey: ["/api/client/approval-batches", selectedBatch?.id, "timesheets", viewAsClientId],
    queryFn: async () => {
      const url = viewAsClientId
        ? `/api/client/approval-batches/${selectedBatch?.id}/timesheets?impersonateClientId=${viewAsClientId}`
        : `/api/client/approval-batches/${selectedBatch?.id}/timesheets`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch timesheets");
      }
      return response.json();
    },
    enabled: !!selectedBatch,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ timesheetId, rating, comments }: { timesheetId: string; rating: number; comments: string }) => {
      const response = await apiRequest("POST", `/api/client/timesheets/${timesheetId}/approve`, {
        rating,
        comments,
        ...(viewAsClientId && { impersonateClientId: viewAsClientId }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast.success("Timesheet approved successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/client/approval-batches", selectedBatch?.id, "timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/approval-batches"] });
      setApproveDialogOpen(false);
      setSelectedTimesheet(null);
      setRating(0);
      setComments("");
    },
    onError: () => {
      toast.error("Failed to approve timesheet");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ timesheetId, rating, comments }: { timesheetId: string; rating: number; comments: string }) => {
      const response = await apiRequest("POST", `/api/client/timesheets/${timesheetId}/reject`, {
        rating,
        comments,
        ...(viewAsClientId && { impersonateClientId: viewAsClientId }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast.success("Timesheet rejected");
      queryClient.invalidateQueries({ queryKey: ["/api/client/approval-batches", selectedBatch?.id, "timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/approval-batches"] });
      setRejectDialogOpen(false);
      setSelectedTimesheet(null);
      setRating(0);
      setComments("");
    },
    onError: () => {
      toast.error("Failed to reject timesheet");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'pending':
      case 'pending_approval':
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getBatchStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const calculateTotalHours = (timesheet: Timesheet, minimumBillableHours: number = 8) => {
    let total = 0;
    days.forEach(day => {
      const dayTotal = (timesheet as any)[`${day}Total`];
      const disableMin = (timesheet as any)[`${day}DisableMinHours`];
      if (dayTotal) {
        const actualHours = parseFloat(dayTotal) || 0;
        const billableHours = disableMin ? actualHours : Math.max(actualHours, minimumBillableHours);
        total += billableHours;
      }
    });
    return total.toFixed(2);
  };

  const openApproveDialog = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setRating(0);
    setComments("");
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setRating(0);
    setComments("");
    setRejectDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedTimesheet) {
      approveMutation.mutate({
        timesheetId: selectedTimesheet.id,
        rating,
        comments,
      });
    }
  };

  const handleReject = () => {
    if (selectedTimesheet && comments.trim()) {
      rejectMutation.mutate({
        timesheetId: selectedTimesheet.id,
        rating,
        comments,
      });
    }
  };

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async (payload: {
      timesheetId: string;
      fields: Record<string, string>;
      editReason: string;
      approveAfterEdit: boolean;
      rating?: number;
      comments?: string;
    }) => {
      const response = await apiRequest('POST', `/api/client/timesheets/${payload.timesheetId}/edit`, {
        ...payload.fields,
        editReason: payload.editReason,
        approveAfterEdit: payload.approveAfterEdit,
        rating: payload.rating,
        comments: payload.comments,
        ...(viewAsClientId && { impersonateClientId: viewAsClientId }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast.success(editApproveAfter ? 'Timesheet edited and approved!' : 'Timesheet edited successfully');
      queryClient.invalidateQueries({ queryKey: ["/api/client/approval-batches", selectedBatch?.id, "timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/approval-batches"] });
      setEditDialogOpen(false);
      setEditingTimesheet(null);
      setEditFormState(null);
      setEditReason('');
      setEditApproveAfter(false);
      setEditRating(0);
    },
    onError: () => {
      toast.error('Failed to save timesheet edits');
    },
  });

  const openEditDialog = (timesheet: Timesheet) => {
    setEditingTimesheet(timesheet);
    setEditFormState(buildInitialEditState(timesheet));
    setEditReason('');
    setEditApproveAfter(false);
    setEditRating(0);
    setEditDialogOpen(true);
  };

  const updateDayField = useCallback((day: DayKey, field: keyof DayEditState, val: string) => {
    setEditFormState(prev => {
      if (!prev) return prev;
      const dayState = { ...prev[day], [field]: val };
      // Auto-recalc total when start/end/break changes
      if (field === 'start' || field === 'end' || field === 'break') {
        dayState.total = calcTotal(dayState.start, dayState.end, dayState.break);
      }
      return { ...prev, [day]: dayState };
    });
  }, []);

  const handleEditSave = (approveAfter: boolean) => {
    if (!editingTimesheet || !editFormState) return;
    if (!editReason.trim()) {
      toast.error('Please provide a reason for the edit');
      return;
    }
    const fields: Record<string, string> = {};
    for (const day of days) {
      fields[`${day}Start`] = editFormState[day].start;
      fields[`${day}End`] = editFormState[day].end;
      fields[`${day}Break`] = editFormState[day].break;
      fields[`${day}Total`] = editFormState[day].total;
    }
    setEditApproveAfter(approveAfter);
    editMutation.mutate({
      timesheetId: editingTimesheet.id,
      fields,
      editReason: editReason.trim(),
      approveAfterEdit: approveAfter,
      rating: approveAfter && editRating > 0 ? editRating : undefined,
    });
  };

  if (isLoadingClient || isLoadingBatches) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-48 mb-8" />
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-client-portal-title">
            {clientInfo?.companyName || "Client Portal"}
          </h1>
        </div>
        <p className="text-muted-foreground">
          Review and approve driver timesheets for your company
        </p>
      </div>

      {selectedBatch ? (
        <div>
          <Button
            variant="ghost"
            className="mb-4 gap-2"
            onClick={() => setSelectedBatch(null)}
            data-testid="button-back-to-batches"
          >
            ← Back to batches
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Week of {format(parseISO(selectedBatch.weekStartDate), "MMMM d, yyyy")}
                  </CardTitle>
                  <CardDescription>
                    {timesheets?.length || 0} timesheet(s) to review
                  </CardDescription>
                </div>
                {getBatchStatusBadge(selectedBatch.status)}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTimesheets ? (
                <div className="space-y-4">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              ) : timesheets && timesheets.length > 0 ? (
                <div className="space-y-4">
                  {timesheets.map((timesheet) => (
                    <Card key={timesheet.id} className="border" data-testid={`card-timesheet-${timesheet.id}`}>
                      <CardContent className="pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium" data-testid={`text-driver-name-${timesheet.id}`}>
                                {timesheet.driverName}
                              </span>
                              {getStatusBadge(timesheet.approvalStatus)}
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              Total: {calculateTotalHours(timesheet)} hours
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 text-xs">
                              {days.map((day, idx) => {
                                const client = (timesheet as any)[`${day}Client`];
                                const total = (timesheet as any)[`${day}Total`];
                                const start = (timesheet as any)[`${day}Start`];
                                const end = (timesheet as any)[`${day}End`];
                                const hasWork = client && start && end;

                                const weekStart = parseISO(selectedBatch.weekStartDate);
                                const dayDate = addDays(weekStart, idx);

                                // Calculate billable hours with minimum (default 8)
                                const minimumBillableHours = 8; // TODO: Get from client settings
                                const actualHours = parseFloat(total || "0");
                                const disableMin = (timesheet as any)[`${day}DisableMinHours`];
                                const billableHours = disableMin ? actualHours : Math.max(actualHours, minimumBillableHours);
                                const minimumApplied = !disableMin && hasWork && billableHours > actualHours;
                                const minDisabled = disableMin && hasWork && actualHours < minimumBillableHours;

                                return (
                                  <div
                                    key={day}
                                    className={`text-center p-2 rounded space-y-0.5 ${hasWork ? 'bg-primary/10' : 'bg-muted/50'}`}
                                  >
                                    {/* Day label */}
                                    <div className="font-semibold text-xs">{dayLabels[idx]}</div>

                                    {hasWork ? (
                                      <>
                                        {/* Date */}
                                        <div className="text-[10px] text-muted-foreground hidden sm:block">
                                          {format(dayDate, "MMM d")}
                                        </div>

                                        {/* Work hours */}
                                        <div className="text-[10px] text-muted-foreground font-medium hidden sm:block">
                                          {start} - {end}
                                        </div>

                                        {/* Billable hours - prominent */}
                                        <div className="text-primary font-bold text-sm mt-1">
                                          {billableHours.toFixed(2)}h
                                        </div>

                                        {/* Minimum applied indicator */}
                                        {minimumApplied && (
                                          <div
                                            className="text-[9px] text-blue-600 dark:text-blue-400 font-medium hidden sm:block"
                                            title={`Actual: ${actualHours.toFixed(2)}h, Billable: ${billableHours.toFixed(2)}h`}
                                          >
                                            Min applied
                                          </div>
                                        )}

                                        {minDisabled && (
                                          <div
                                            className="text-[9px] text-orange-600 dark:text-orange-400 font-medium hidden sm:block"
                                            title={`Actual: ${actualHours.toFixed(2)}h, Min (8h) disabled`}
                                          >
                                            Min disabled
                                          </div>
                                        )}

                                          {/* Expense info */}
                                          {(timesheet as any)[`${day}ExpenseAmount`] > 0 && (
                                            <div className="text-[10px] text-red-600 dark:text-red-400 font-medium hidden sm:block mt-1">
                                              Exp: €{parseFloat((timesheet as any)[`${day}ExpenseAmount`]).toFixed(2)}
                                            </div>
                                          )}
                                          {(timesheet as any)[`${day}ExpenseReceipt`] && (
                                            <a 
                                              href={(timesheet as any)[`${day}ExpenseReceipt`].startsWith('http') || (timesheet as any)[`${day}ExpenseReceipt`].startsWith('/') ? (timesheet as any)[`${day}ExpenseReceipt`] : `/${(timesheet as any)[`${day}ExpenseReceipt`]}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[9px] text-blue-600 hover:underline block mt-0.5"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              View Receipt
                                            </a>
                                          )}

                                          {/* Client name */}
                                        <div className="text-[10px] text-muted-foreground truncate hidden sm:block mt-1" title={client}>
                                          {client}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-muted-foreground text-sm py-4">-</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex flex-col xs:flex-row items-stretch sm:items-start justify-end gap-2 mt-3 sm:mt-0">
                            {timesheet.approvalStatus === 'pending_approval' ? (
                              <>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => openRejectDialog(timesheet)}
                                  data-testid={`button-reject-${timesheet.id}`}
                                  className="w-fit sm:w-auto"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(timesheet)}
                                  data-testid={`button-edit-${timesheet.id}`}
                                  className="w-fit sm:w-auto"
                                >
                                  <Pencil className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white w-fit sm:w-auto"
                                  onClick={() => openApproveDialog(timesheet)}
                                  data-testid={`button-approve-${timesheet.id}`}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                              </>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                {timesheet.clientApprovedBy && (
                                  <span>By {timesheet.clientApprovedBy}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {timesheet.clientComments && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Comments:</span> {timesheet.clientComments}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No timesheets in this batch
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {batches && batches.length > 0 ? (
            batches.map((batch) => (
              <Card
                key={batch.id}
                className="cursor-pointer hover-elevate transition-all"
                onClick={() => setSelectedBatch(batch)}
                data-testid={`card-batch-${batch.id}`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Calendar className="w-8 h-8 text-primary" />
                      <div>
                        <h3 className="font-semibold">
                          Week of {format(parseISO(batch.weekStartDate), "MMMM d, yyyy")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {batch.sentAt
                            ? `Sent ${format(parseISO(batch.sentAt), "MMM d, yyyy 'at' h:mm a")}`
                            : `Created ${format(parseISO(batch.createdAt), "MMM d, yyyy")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getBatchStatusBadge(batch.status)}
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No approval batches</h3>
                <p className="text-muted-foreground">
                  There are no timesheets awaiting your approval at this time.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Timesheet</DialogTitle>
            <DialogDescription>
              Confirm approval for {selectedTimesheet?.driverName}'s timesheet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Driver Rating (Optional)</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                    data-testid={`button-rating-${star}`}
                  >
                    <Star
                      className={`w-6 h-6 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any comments about the driver's work..."
                data-testid="input-approve-comments"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending} data-testid="button-confirm-approve">
              {approveMutation.isPending ? "Approving..." : "Approve Timesheet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Timesheet
            </DialogTitle>
            <DialogDescription>
              {editingTimesheet && (
                <span>
                  <span className="font-semibold text-foreground">{editingTimesheet.driverName}</span>
                  {' — Week of '}
                  <span className="font-semibold text-foreground">
                    {format(parseISO(editingTimesheet.weekStartDate), 'MMMM d, yyyy')}
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {editFormState && editingTimesheet && (
            <div className="space-y-4 py-2">
              {/* Per-day rows */}
              <div className="space-y-3">
                {days.map((day, idx) => {
                  const hasWork = !!(editFormState[day].start || editFormState[day].end);
                  return (
                    <div key={day} className={`p-3 rounded-lg border ${hasWork ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold w-10">{dayLabels[idx]}</span>
                        {hasWork && (
                          <span className="text-xs text-muted-foreground">
                            Total: <strong>{editFormState[day].total}h</strong>
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Start</Label>
                          <Input
                            placeholder="HH:MM"
                            value={editFormState[day].start}
                            onChange={(e) => updateDayField(day, 'start', e.target.value)}
                            className="h-8 text-sm"
                            data-testid={`edit-${day}-start`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">End</Label>
                          <Input
                            placeholder="HH:MM"
                            value={editFormState[day].end}
                            onChange={(e) => updateDayField(day, 'end', e.target.value)}
                            className="h-8 text-sm"
                            data-testid={`edit-${day}-end`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Break (min)</Label>
                          <Input
                            placeholder="30"
                            value={editFormState[day].break}
                            onChange={(e) => updateDayField(day, 'break', e.target.value)}
                            className="h-8 text-sm"
                            data-testid={`edit-${day}-break`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Edit reason */}
              <div className="space-y-2">
                <Label htmlFor="edit-reason" className="flex items-center gap-1">
                  Reason for edit
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="edit-reason"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Please explain what you changed and why..."
                  className="min-h-[80px]"
                  data-testid="input-edit-reason"
                />
              </div>

              {/* Optional rating (shown when approve after edit is possible) */}
              <div className="space-y-2">
                <Label>Driver Rating (Optional)</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditRating(star === editRating ? 0 : star)}
                      className="p-1 hover:scale-110 transition-transform"
                      data-testid={`button-edit-rating-${star}`}
                    >
                      <Star
                        className={`w-5 h-5 ${star <= editRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleEditSave(false)}
              disabled={editMutation.isPending || !editReason.trim()}
              className="w-full sm:w-auto"
              data-testid="button-confirm-edit-save"
            >
              {editMutation.isPending && !editApproveAfter ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              onClick={() => handleEditSave(true)}
              disabled={editMutation.isPending || !editReason.trim()}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              data-testid="button-confirm-edit-approve"
            >
              {editMutation.isPending && editApproveAfter ? 'Saving...' : 'Save & Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Reject Timesheet
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedTimesheet?.driverName}'s timesheet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Driver Rating (Optional)</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                    data-testid={`button-reject-rating-${star}`}
                  >
                    <Star
                      className={`w-6 h-6 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reject-comments">Reason for Rejection *</Label>
              <Textarea
                id="reject-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Please explain why you are rejecting this timesheet..."
                required
                data-testid="input-reject-comments"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !comments.trim()}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Timesheet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
