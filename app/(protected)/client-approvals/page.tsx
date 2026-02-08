
'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Plus, Send, Copy, CheckCircle, Clock, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

interface ApprovalBatch {
  id: string;
  clientName: string;
  weekStartDate: string;
  approvalToken: string;
  status: string;
  createdAt: string;
  timesheetCount?: number;
}

interface Timesheet {
  id: string;
  driverName: string;
  weekStartDate: string;
  approvalStatus: string;
  mondayClient?: string;
  tuesdayClient?: string;
  wednesdayClient?: string;
  thursdayClient?: string;
  fridayClient?: string;
  saturdayClient?: string;
  sundayClient?: string;
}

interface Client {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
}

export default function ClientApprovalsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: batches, isLoading: batchesLoading } = useQuery<ApprovalBatch[]>({
    queryKey: ["/api/approval-batches"],
  });

  const { data: timesheets } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
  });

  // Filter batches based on status
  const filteredBatches = batches?.filter(batch => {
    if (statusFilter === "all") return true;
    return batch.status === statusFilter;
  }) || [];

  // Calculate stats
  const totalBatches = batches?.length || 0;
  const pendingBatches = batches?.filter(b => b.status === "pending").length || 0;
  const approvedBatches = batches?.filter(b => b.status === "approved").length || 0;
  const rejectedBatches = batches?.filter(b => b.status === "rejected").length || 0;

  const handleCopyLink = (token: string) => {
    const approvalUrl = `${window.location.origin}/approve/${token}`;
    navigator.clipboard.writeText(approvalUrl);
    toast.success("Link Copied");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle className="w-3 h-3" />
            All Approved
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            Partial
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-client-approvals">
            Client Approvals
          </h1>
          <p className="text-muted-foreground mt-1">
            Create batch approval links for clients to review driver timesheets
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-batch">
              <Plus className="w-4 h-4 mr-2" />
              Create Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Approval Batch</DialogTitle>
              <DialogDescription>
                Select client, week, and drivers to create a batch approval link
              </DialogDescription>
            </DialogHeader>
            <CreateBatchForm
              timesheets={timesheets || []}
              onSuccess={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Buttons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className={`cursor-pointer transition-all ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`} onClick={() => setStatusFilter("all")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Batches
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBatches}</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-all ${statusFilter === "pending" ? "ring-2 ring-primary" : ""}`} onClick={() => setStatusFilter("pending")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBatches}</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-all ${statusFilter === "approved" ? "ring-2 ring-primary" : ""}`} onClick={() => setStatusFilter("approved")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedBatches}</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-all ${statusFilter === "rejected" ? "ring-2 ring-primary" : ""}`} onClick={() => setStatusFilter("rejected")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rejected
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedBatches}</div>
          </CardContent>
        </Card>
      </div>

      {batchesLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !filteredBatches || filteredBatches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Send className="w-16 h-16 text-muted-foreground mb-4 opacity-40" />
            <h3 className="text-lg font-medium mb-2">
              {statusFilter === "all" ? "No approval batches yet" : `No ${statusFilter} batches`}
            </h3>
            <p className="text-muted-foreground text-sm text-center mb-4">
              {statusFilter === "all"
                ? "Create your first batch to send approval links to clients"
                : `There are no batches with ${statusFilter} status`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBatches.map((batch) => (
            <Card key={batch.id} className="hover-elevate" data-testid={`card-batch-${batch.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{batch.clientName}</CardTitle>
                    <CardDescription>
                      Week of {format(parseISO(batch.weekStartDate), 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(batch.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0">
                <div className="text-sm text-muted-foreground">
                  Created {format(parseISO(batch.createdAt), 'MMM d, yyyy h:mm a')}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(batch.approvalToken)}
                    data-testid={`button-copy-batch-link-${batch.id}`}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface CreateBatchFormProps {
  timesheets: Timesheet[];
  onSuccess: () => void;
}

function CreateBatchForm({ timesheets, onSuccess }: CreateBatchFormProps) {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [selectedTimesheets, setSelectedTimesheets] = useState<Set<string>>(new Set());
  const [sendEmail, setSendEmail] = useState<boolean>(false);

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: any) => {
      // Always force sendEmail false for now due to user request
      return await apiRequest("POST", "/api/approval-batches", { ...data, sendEmail: false });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/approval-batches"] });
      // Only invalidate specific queries if possible, but timesheets is general
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });

      const approvalUrl = `${window.location.origin}/approve/${data.approvalToken}`;
      navigator.clipboard.writeText(approvalUrl);

      toast.success("Batch created. Email sending is currently disabled. Link copied to clipboard.");
      onSuccess();
    },
    onError: () => {
      toast.error("Failed to create approval batch");
    },
  });

  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  // Get unique weeks from timesheets
  const weeks = Array.from(new Set(timesheets.map((t) => t.weekStartDate))).sort().reverse();

  // Helper function to normalize client names
  const normalizeClientName = (name: string): string => {
    return name.toLowerCase().trim()
      .replace(/[.,&'"()[\]{}]/g, ' ')
      .replace(/\band\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const clientNamesMatch = (timesheetClient: string | undefined | null, selectedClientName: string): boolean => {
    if (!timesheetClient) return false;
    const tsNorm = normalizeClientName(timesheetClient);
    const selNorm = normalizeClientName(selectedClientName);
    return tsNorm.includes(selNorm) || selNorm.includes(tsNorm); // Simple substring matching
  };

  // Filter eligible timesheets
  const eligibleTimesheets = selectedClient && selectedWeek
    ? timesheets.filter((t) => {
      if (t.weekStartDate !== selectedWeek) return false;

      // Find if this client is mentioned in the timesheet
      const hasClient = [
        t.mondayClient, t.tuesdayClient, t.wednesdayClient,
        t.thursdayClient, t.fridayClient, t.saturdayClient, t.sundayClient
      ].some((c) => clientNamesMatch(c, selectedClient.companyName));

      return hasClient;
    })
    : [];

  const handleToggleTimesheet = (timesheetId: string) => {
    const newSelected = new Set(selectedTimesheets);
    if (newSelected.has(timesheetId)) {
      newSelected.delete(timesheetId);
    } else {
      newSelected.add(timesheetId);
    }
    setSelectedTimesheets(newSelected);
  };

  const handleSubmit = () => {
    if (!selectedClient || !selectedWeek || selectedTimesheets.size === 0) {
      toast.error("Please select client, week, and at least one driver");
      return;
    }

    createBatchMutation.mutate({
      clientName: selectedClient.companyName,
      weekStartDate: selectedWeek,
      timesheetIds: Array.from(selectedTimesheets),
      clientId: selectedClientId,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="client">Client</Label>
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger id="client">
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {!clients || clients.length === 0 ? (
              <div className="px-2 py-6 text-sm text-center text-muted-foreground">
                No clients found.
              </div>
            ) : (
              clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.companyName}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="week">Week</Label>
        <Select value={selectedWeek} onValueChange={setSelectedWeek}>
          <SelectTrigger id="week">
            <SelectValue placeholder="Select a week" />
          </SelectTrigger>
          <SelectContent>
            {weeks.map((week) => (
              <SelectItem key={week} value={week}>
                Week of {format(parseISO(week), 'MMM d, yyyy')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedClient && selectedWeek && (
        <div className="space-y-2">
          <Label>Select Drivers ({eligibleTimesheets.length} eligible)</Label>
          {eligibleTimesheets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No matching timesheets found for this client and week
            </p>
          ) : (
            <div className="border rounded-md p-4 space-y-3 max-h-64 overflow-y-auto">
              {eligibleTimesheets.map((timesheet) => (
                <div key={timesheet.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={timesheet.id}
                    checked={selectedTimesheets.has(timesheet.id)}
                    onCheckedChange={() => handleToggleTimesheet(timesheet.id)}
                  />
                  <label htmlFor={timesheet.id} className="text-sm cursor-pointer">
                    {timesheet.driverName}
                    {timesheet.approvalStatus !== 'draft' && <span className="text-muted-foreground text-xs ml-2">({timesheet.approvalStatus})</span>}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email option disabled in UI */}
      {selectedClient && selectedTimesheets.size > 0 && (
        <div className="space-y-3 pt-2 border-t opacity-60">
          <div className="flex items-center space-x-2">
            <Checkbox id="send-email" checked={false} disabled />
            <label htmlFor="send-email" className="text-sm font-medium leading-none text-muted-foreground">
              Send approval email (Disabled)
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button
          onClick={handleSubmit}
          disabled={createBatchMutation.isPending || selectedTimesheets.size === 0}
        >
          {createBatchMutation.isPending ? "Creating..." : "Create Batch"}
        </Button>
      </div>
    </div>
  );
}
