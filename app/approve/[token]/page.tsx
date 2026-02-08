
'use client';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TimeSelect } from "@/components/ui/time-select";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, AlertCircle, Plus, Building2 } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// Types matching Schema (re-defined or imported if available, keeping local for portability)
interface ApprovalBatch {
  id: string;
  clientName: string;
  weekStartDate: string;
  approvalToken: string;
  status: string;
  minimumBillableHours?: number;
}

interface Timesheet {
  id: string;
  driverName: string;
  approvalStatus: string;
  clientApprovedAt: string | null;
  clientApprovedBy: string | null;
  clientRating: number | null;
  clientComments: string | null;
  // Days
  sundayClient: string | null;
  sundayStart: string | null;
  sundayEnd: string | null;
  sundayBreak: string | null;
  sundayPoa: string | null;
  sundayOtherWork: string | null;
  sundayTotal: string | null;
  sundayNightOut: string | null;
  sundayExpenseAmount: string | null;
  sundayExpenseReceipt: string | null;

  mondayClient: string | null;
  mondayStart: string | null;
  mondayEnd: string | null;
  mondayBreak: string | null;
  mondayPoa: string | null;
  mondayOtherWork: string | null;
  mondayTotal: string | null;
  mondayNightOut: string | null;
  mondayExpenseAmount: string | null;
  mondayExpenseReceipt: string | null;

  tuesdayClient: string | null;
  tuesdayStart: string | null;
  tuesdayEnd: string | null;
  tuesdayBreak: string | null;
  tuesdayPoa: string | null;
  tuesdayOtherWork: string | null;
  tuesdayTotal: string | null;
  tuesdayNightOut: string | null;
  tuesdayExpenseAmount: string | null;
  tuesdayExpenseReceipt: string | null;

  wednesdayClient: string | null;
  wednesdayStart: string | null;
  wednesdayEnd: string | null;
  wednesdayBreak: string | null;
  wednesdayPoa: string | null;
  wednesdayOtherWork: string | null;
  wednesdayTotal: string | null;
  wednesdayNightOut: string | null;
  wednesdayExpenseAmount: string | null;
  wednesdayExpenseReceipt: string | null;

  thursdayClient: string | null;
  thursdayStart: string | null;
  thursdayEnd: string | null;
  thursdayBreak: string | null;
  thursdayPoa: string | null;
  thursdayOtherWork: string | null;
  thursdayTotal: string | null;
  thursdayNightOut: string | null;
  thursdayExpenseAmount: string | null;
  thursdayExpenseReceipt: string | null;

  fridayClient: string | null;
  fridayStart: string | null;
  fridayEnd: string | null;
  fridayBreak: string | null;
  fridayPoa: string | null;
  fridayOtherWork: string | null;
  fridayTotal: string | null;
  fridayNightOut: string | null;
  fridayExpenseAmount: string | null;
  fridayExpenseReceipt: string | null;

  saturdayClient: string | null;
  saturdayStart: string | null;
  saturdayEnd: string | null;
  saturdayBreak: string | null;
  saturdayPoa: string | null;
  saturdayOtherWork: string | null;
  saturdayTotal: string | null;
  saturdayNightOut: string | null;
  saturdayExpenseAmount: string | null;
  saturdayExpenseReceipt: string | null;
}

interface BatchData {
  batch: ApprovalBatch;
  timesheets: Timesheet[];
}

export default function ApproveTimesheet() {
  const params = useParams();
  const token = params?.token as string;

  const { data, isLoading, error } = useQuery<BatchData>({
    queryKey: [`/api/approve/${token}`],
    queryFn: async () => {
      const res = await fetch(`/api/approve/${token}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading approval batch...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-destructive" />
            </div>
            <CardTitle className="text-center">Approval Link Invalid</CardTitle>
            <CardDescription className="text-center">
              This approval link is invalid, expired, or has already been used.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-full bg-primary/10 mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-batch-approval">
            Driver Timesheet Approval
          </h1>
          <p className="text-muted-foreground">Review and approve driver timesheets for {data.batch.clientName}</p>
        </div>

        <Card className="mb-6 border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{data.batch.clientName}</CardTitle>
                <CardDescription>
                  Week of {format(parseISO(data.batch.weekStartDate), "MMMM d, yyyy")}
                </CardDescription>
              </div>
              <Badge variant="outline">{data.timesheets.length} {data.timesheets.length === 1 ? 'driver' : 'drivers'}</Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {data.timesheets.map((timesheet) => (
            <DriverTimesheetCard
              key={timesheet.id}
              timesheet={timesheet}
              token={token!}
              batchClientName={data.batch.clientName}
              batchData={data.batch}
            />
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Accept Recruitment &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}

interface DriverTimesheetCardProps {
  timesheet: Timesheet;
  token: string;
}

function DriverTimesheetCard({ timesheet, token, batchClientName, batchData }: DriverTimesheetCardProps & { batchClientName: string; batchData: ApprovalBatch }) {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const isCompleted = timesheet.approvalStatus === "approved" || timesheet.approvalStatus === "rejected";

  // Get minimum billable hours from batch data
  const minimumBillableHours = batchData.minimumBillableHours || 8;

  // Calculate the actual date for each day based on weekStartDate
  const weekStart = parseISO(batchData.weekStartDate);

  // Helper to get date for a day index (0 = Sunday in our array order)
  const getDayDate = (dayIndex: number) => {
    return addDays(weekStart, dayIndex);
  };

  const dayData = [
    {
      name: "Sunday",
      date: getDayDate(0),
      client: timesheet.sundayClient,
      start: timesheet.sundayStart,
      end: timesheet.sundayEnd,
      break: timesheet.sundayBreak,
      poa: timesheet.sundayPoa,
      otherWork: timesheet.sundayOtherWork,
      total: timesheet.sundayTotal,
      nightOut: timesheet.sundayNightOut,
      expenseAmount: timesheet.sundayExpenseAmount,
      expenseReceipt: timesheet.sundayExpenseReceipt,
    },
    {
      name: "Monday",
      date: getDayDate(1),
      client: timesheet.mondayClient,
      start: timesheet.mondayStart,
      end: timesheet.mondayEnd,
      break: timesheet.mondayBreak,
      poa: timesheet.mondayPoa,
      otherWork: timesheet.mondayOtherWork,
      total: timesheet.mondayTotal,
      nightOut: timesheet.mondayNightOut,
      expenseAmount: timesheet.mondayExpenseAmount,
      expenseReceipt: timesheet.mondayExpenseReceipt,
    },
    {
      name: "Tuesday",
      date: getDayDate(2),
      client: timesheet.tuesdayClient,
      start: timesheet.tuesdayStart,
      end: timesheet.tuesdayEnd,
      break: timesheet.tuesdayBreak,
      poa: timesheet.tuesdayPoa,
      otherWork: timesheet.tuesdayOtherWork,
      total: timesheet.tuesdayTotal,
      nightOut: timesheet.tuesdayNightOut,
      expenseAmount: timesheet.tuesdayExpenseAmount,
      expenseReceipt: timesheet.tuesdayExpenseReceipt,
    },
    {
      name: "Wednesday",
      date: getDayDate(3),
      client: timesheet.wednesdayClient,
      start: timesheet.wednesdayStart,
      end: timesheet.wednesdayEnd,
      break: timesheet.wednesdayBreak,
      poa: timesheet.wednesdayPoa,
      otherWork: timesheet.wednesdayOtherWork,
      total: timesheet.wednesdayTotal,
      nightOut: timesheet.wednesdayNightOut,
      expenseAmount: timesheet.wednesdayExpenseAmount,
      expenseReceipt: timesheet.wednesdayExpenseReceipt,
    },
    {
      name: "Thursday",
      date: getDayDate(4),
      client: timesheet.thursdayClient,
      start: timesheet.thursdayStart,
      end: timesheet.thursdayEnd,
      break: timesheet.thursdayBreak,
      poa: timesheet.thursdayPoa,
      otherWork: timesheet.thursdayOtherWork,
      total: timesheet.thursdayTotal,
      nightOut: timesheet.thursdayNightOut,
      expenseAmount: timesheet.thursdayExpenseAmount,
      expenseReceipt: timesheet.thursdayExpenseReceipt,
    },
    {
      name: "Friday",
      date: getDayDate(5),
      client: timesheet.fridayClient,
      start: timesheet.fridayStart,
      end: timesheet.fridayEnd,
      break: timesheet.fridayBreak,
      poa: timesheet.fridayPoa,
      otherWork: timesheet.fridayOtherWork,
      total: timesheet.fridayTotal,
      nightOut: timesheet.fridayNightOut,
      expenseAmount: timesheet.fridayExpenseAmount,
      expenseReceipt: timesheet.fridayExpenseReceipt,
    },
    {
      name: "Saturday",
      date: getDayDate(6),
      client: timesheet.saturdayClient,
      start: timesheet.saturdayStart,
      end: timesheet.saturdayEnd,
      break: timesheet.saturdayBreak,
      poa: timesheet.saturdayPoa,
      otherWork: timesheet.saturdayOtherWork,
      total: timesheet.saturdayTotal,
      nightOut: timesheet.saturdayNightOut,
      expenseAmount: timesheet.saturdayExpenseAmount,
      expenseReceipt: timesheet.saturdayExpenseReceipt,
    },
  ];

  const workedDays = dayData.filter(day =>
    day.client &&
    day.client.trim() !== ""
    // Relaxed check: include days even if client name doesn't perfectly match (legacy logic was strict)
    // day.client.trim().toLowerCase() === batchClientName.trim().toLowerCase()
  );

  const getTotalHours = () => {
    return workedDays.reduce((sum, day) => {
      const actualHours = parseFloat(day.total || "0");
      const billableHours = Math.max(actualHours, minimumBillableHours);
      return sum + billableHours;
    }, 0);
  };

  // Calculate discrepancies
  const getDiscrepancies = () => {
    let count = 0;
    workedDays.forEach(day => {
      const dayHours = parseFloat(day.total || "0");
      // Flag shifts under 8 hours
      if (dayHours > 0 && dayHours < 8) {
        count++;
      }
    });
    return count;
  };

  const discrepancyCount = getDiscrepancies();

  return (
    <Card data-testid={`card-driver-${timesheet.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              {timesheet.driverName}
              {discrepancyCount > 0 && (
                <Badge
                  variant="destructive"
                  className="gap-1"
                  data-testid={`badge-discrepancies-${timesheet.id}`}
                >
                  <AlertCircle className="w-3 h-3" />
                  {discrepancyCount} {discrepancyCount === 1 ? 'Discrepancy' : 'Discrepancies'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Total Hours: <span className="font-semibold text-foreground">{getTotalHours().toFixed(2)}h</span>
            </CardDescription>
          </div>
          <div>
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
            ) : (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                Pending
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {workedDays.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hours logged this week</p>
        ) : (
          <div className="space-y-3">
            {workedDays.map((day) => {
              const dayHours = parseFloat(day.total || "0");
              const billableHours = Math.max(dayHours, minimumBillableHours);
              const minimumApplied = billableHours > dayHours;
              const hasDiscrepancy = dayHours > 0 && dayHours < 8;

              return (
                <div
                  key={day.name}
                  className={`border rounded-md p-4 space-y-2 ${hasDiscrepancy ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-muted/30'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-semibold text-sm">{day.name}</p>
                        <p className="text-xs text-muted-foreground">{format(day.date, "MMM d")}</p>
                        <p className="text-xs text-muted-foreground">{day.client}</p>
                      </div>
                      {hasDiscrepancy && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Under 8h
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="font-semibold">
                        {billableHours.toFixed(2)}h total
                      </Badge>
                      {minimumApplied && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Min. applied ({dayHours.toFixed(2)}h → {billableHours.toFixed(2)}h)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs pt-2 border-t">
                    <div>
                      <p className="text-muted-foreground">Start</p>
                      <p className="font-medium">{day.start || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">End</p>
                      <p className="font-medium">{day.end || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Break</p>
                      <p className="font-medium">{day.break || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">POA</p>
                      <p className="font-medium">{day.poa || "0"}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Other</p>
                      <p className="font-medium">{day.otherWork || "0"}h</p>
                    </div>
                  </div>

                  {(day.nightOut === "true" || (day.expenseAmount && parseFloat(day.expenseAmount) > 0)) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2 border-t">
                      {day.nightOut === "true" && (
                        <div>
                          <p className="text-muted-foreground">Night Out</p>
                          <p className="font-medium text-blue-600">✓ Yes</p>
                        </div>
                      )}
                      {day.expenseAmount && parseFloat(day.expenseAmount) > 0 && (
                        <>
                          <div>
                            <p className="text-muted-foreground">Expense Amount</p>
                            <p className="font-medium">£{parseFloat(day.expenseAmount).toFixed(2)}</p>
                          </div>
                          {day.expenseReceipt && (
                            <div>
                              <p className="text-muted-foreground">Receipt</p>
                              <p className="font-medium truncate text-blue-600">{day.expenseReceipt}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isCompleted && (
          <div className="pt-4 border-t">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {timesheet.approvalStatus === "approved" ? "Approved" : "Rejected"} by {timesheet.clientApprovedBy}
              </p>
              {timesheet.clientApprovedAt && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(timesheet.clientApprovedAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
              {timesheet.clientRating && (
                <div className="mt-2">
                  <Label className="text-xs">Client Rating:</Label>
                  <p className="text-sm font-medium mt-1">
                    {timesheet.clientRating}/10 {timesheet.clientRating <= 3 ? '⭐ Poor' : timesheet.clientRating <= 6 ? '⭐⭐ Fair' : timesheet.clientRating <= 8 ? '⭐⭐⭐ Good' : '⭐⭐⭐⭐ Excellent'}
                  </p>
                </div>
              )}
              {timesheet.clientComments && (
                <div className="mt-2">
                  <Label className="text-xs">Comments:</Label>
                  <p className="text-sm text-muted-foreground mt-1">{timesheet.clientComments}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!isCompleted && (
          <div className="flex gap-2 pt-4 border-t">
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 gap-2" data-testid={`button-approve-${timesheet.id}`}>
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Timesheet</DialogTitle>
                  <DialogDescription>
                    Approve {timesheet.driverName}'s timesheet ({getTotalHours().toFixed(2)} hours)
                  </DialogDescription>
                </DialogHeader>
                <ApproveForm
                  timesheetId={timesheet.id}
                  token={token}
                  driverName={timesheet.driverName}
                  timesheet={timesheet}
                  dayData={workedDays}
                  onSuccess={() => setApproveDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex-1 gap-2" data-testid={`button-reject-${timesheet.id}`}>
                  <XCircle className="w-4 h-4" />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Timesheet</DialogTitle>
                  <DialogDescription>
                    Reject {timesheet.driverName}'s timesheet with a reason
                  </DialogDescription>
                </DialogHeader>
                <RejectForm
                  timesheetId={timesheet.id}
                  token={token}
                  driverName={timesheet.driverName}
                  onSuccess={() => setRejectDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ApproveFormProps {
  timesheetId: string;
  token: string;
  driverName: string;
  timesheet: Timesheet;
  dayData: any[];
  onSuccess: () => void;
}

function ApproveForm({ timesheetId, token, driverName, timesheet, dayData, onSuccess }: ApproveFormProps) {
  const queryClient = useQueryClient();
  const [approverName, setApproverName] = useState("");
  const [rating, setRating] = useState("");
  const [comments, setComments] = useState("");
  const [showEditMode, setShowEditMode] = useState(false);

  const [editedTimes, setEditedTimes] = useState<Record<string, any>>({});

  const approveMutation = useMutation({
    mutationFn: async () => {
      const modifications: Record<string, any> = {};

      Object.keys(editedTimes).forEach((field) => {
        const originalField = field.replace('edited_', '');
        const originalValue = (timesheet as any)[originalField];
        const editedValue = editedTimes[field];

        if (editedValue !== originalValue && editedValue !== undefined && editedValue !== null && editedValue !== '') {
          modifications[originalField] = {
            original: originalValue || '',
            corrected: editedValue,
          };
        }
      });

      return await apiRequest("POST", `/api/approve/${token}/${timesheetId}`, {
        approvedBy: approverName,
        rating: rating ? parseInt(rating) : undefined,
        comments,
        modifications: Object.keys(modifications).length > 0 ? modifications : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/approve/${token}`] });
      toast.success(`${driverName}'s timesheet has been approved`);
      onSuccess();
    },
    onError: () => {
      toast.error("Failed to approve timesheet");
    },
  });

  const handleSubmit = () => {
    if (!approverName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!rating) {
      toast.error("Please rate the driver's performance");
      return;
    }
    approveMutation.mutate();
  };

  const handleTimeChange = (field: string, value: string) => {
    setEditedTimes(prev => ({
      ...prev,
      [`edited_${field}`]: value,
    }));
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label htmlFor="approver-name">Your Name *</Label>
        <Input
          id="approver-name"
          placeholder="Enter your full name"
          value={approverName}
          onChange={(e) => setApproverName(e.target.value)}
          data-testid="input-approver-name"
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/50 rounded border">
        <div className="space-y-1">
          <p className="text-sm font-medium">Need to correct times?</p>
          <p className="text-xs text-muted-foreground">Enable editing if driver-reported times need adjustment</p>
        </div>
        <Button
          variant={showEditMode ? "default" : "outline"}
          size="sm"
          onClick={() => setShowEditMode(!showEditMode)}
          type="button"
          data-testid="button-toggle-edit-mode"
        >
          {showEditMode ? "Hide Edit" : "Edit Times"}
        </Button>
      </div>

      {showEditMode && (
        <div className="space-y-3 p-4 border rounded bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Editing Times - Changes will be tracked
            </p>
          </div>
          {dayData.map((day) => {
            const dayPrefix = day.name.toLowerCase();
            return (
              <div key={day.name} className="space-y-2 p-3 bg-background rounded border">
                <p className="font-semibold text-sm">{day.name}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`${dayPrefix}-start`} className="text-xs">Start Time</Label>
                    <TimeSelect
                      value={editedTimes[`edited_${dayPrefix}Start`] ?? day.start ?? ''}
                      onChange={(value) => handleTimeChange(`${dayPrefix}Start`, value)}
                      placeholder="Start"
                      data-testid={`input-edit-${dayPrefix}-start`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${dayPrefix}-end`} className="text-xs">End Time</Label>
                    <TimeSelect
                      value={editedTimes[`edited_${dayPrefix}End`] ?? day.end ?? ''}
                      onChange={(value) => handleTimeChange(`${dayPrefix}End`, value)}
                      placeholder="End"
                      data-testid={`input-edit-${dayPrefix}-end`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${dayPrefix}-break`} className="text-xs">Break (mins)</Label>
                    <Input
                      id={`${dayPrefix}-break`}
                      type="number"
                      min="0"
                      max="60"
                      defaultValue={day.break || '0'}
                      onChange={(e) => handleTimeChange(`${dayPrefix}Break`, e.target.value)}
                      data-testid={`input-edit-${dayPrefix}-break`}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="rating">Rate Driver Performance (1-10) *</Label>
        <Select value={rating} onValueChange={setRating}>
          <SelectTrigger id="rating" data-testid="select-rating">
            <SelectValue placeholder="Select a rating" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <SelectItem key={num} value={num.toString()}>
                {num} {num <= 3 ? '⭐ Poor' : num <= 6 ? '⭐⭐ Fair' : num <= 8 ? '⭐⭐⭐ Good' : '⭐⭐⭐⭐ Excellent'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="approve-comments">Comments (Optional)</Label>
        <Textarea
          id="approve-comments"
          placeholder="Any additional comments..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          data-testid="input-comments"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSubmit}
          disabled={approveMutation.isPending}
          data-testid="button-confirm-approve"
        >
          {approveMutation.isPending ? "Approving..." : "Confirm Approval"}
        </Button>
      </div>
    </div>
  );
}

interface RejectFormProps {
  timesheetId: string;
  token: string;
  driverName: string;
  onSuccess: () => void;
}

function RejectForm({ timesheetId, token, driverName, onSuccess }: RejectFormProps) {
  const queryClient = useQueryClient();
  const [approverName, setApproverName] = useState("");
  const [rating, setRating] = useState("");
  const [comments, setComments] = useState("");

  const rejectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/reject/${token}/${timesheetId}`, {
        approvedBy: approverName,
        rating: rating ? parseInt(rating) : undefined,
        comments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/approve/${token}`] });
      toast.success(`${driverName}'s timesheet has been rejected`);
      onSuccess();
    },
    onError: () => {
      toast.error("Failed to reject timesheet");
    },
  });

  const handleSubmit = () => {
    if (!approverName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!rating) {
      toast.error("Please rate the driver's performance");
      return;
    }
    if (!comments.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reject-approver-name">Your Name *</Label>
        <Input
          id="reject-approver-name"
          placeholder="Enter your full name"
          value={approverName}
          onChange={(e) => setApproverName(e.target.value)}
          data-testid="input-reject-approver-name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reject-rating">Rate Driver Performance (1-10) *</Label>
        <Select value={rating} onValueChange={setRating}>
          <SelectTrigger id="reject-rating" data-testid="select-reject-rating">
            <SelectValue placeholder="Select a rating" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <SelectItem key={num} value={num.toString()}>
                {num} {num <= 3 ? '⭐ Poor' : num <= 6 ? '⭐⭐ Fair' : num <= 8 ? '⭐⭐⭐ Good' : '⭐⭐⭐⭐ Excellent'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reject-comments">Rejection Reason *</Label>
        <Textarea
          id="reject-comments"
          placeholder="Explain why you are rejecting this timesheet..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
          data-testid="input-reject-comments"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="destructive"
          onClick={handleSubmit}
          disabled={rejectMutation.isPending}
          data-testid="button-confirm-reject"
        >
          {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
        </Button>
      </div>
    </div>
  );
}
