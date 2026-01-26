'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Calendar, Users, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Roster {
  id: string;
  weekStartDate: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  totalEntries: number;
  notes?: string;
}

interface RosterEntry {
  id: string;
  rosterId: string;
  driverName: string;
  driverEmail?: string;
  driverPhone?: string;
  expectedClient?: string;
  notes?: string;
  userId?: string;
  hasSubmitted: boolean;
  timesheetId?: string;
}

interface RosterWithEntries extends Roster {
  entries: RosterEntry[];
}

export default function RosterManagement() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [notes, setNotes] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState<string | null>(null);

  const { data: rosters, isLoading } = useQuery<Roster[]>({
    queryKey: ["/api/rosters"],
  });

  const { data: rosterDetails } = useQuery<RosterWithEntries>({
    queryKey: ["/api/rosters", selectedRoster],
    enabled: !!selectedRoster,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { weekStartDate: string; fileName: string; fileData: string; notes?: string }) => {
      return await apiRequest("POST", "/api/rosters/upload", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rosters"] });
      toast.success("Roster uploaded successfully");
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setNotes("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload roster");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/rosters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rosters"] });
      toast.success("Roster deleted successfully");
      if (selectedRoster === deleteMutation.variables) {
        setSelectedRoster(null);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete roster");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const base64Content = base64Data.split(",")[1];

        await uploadMutation.mutateAsync({
          weekStartDate: format(selectedWeek, "yyyy-MM-dd"),
          fileName: selectedFile.name,
          fileData: base64Content,
          notes: notes || undefined,
        });
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Failed to read file");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const submissionStats = rosterDetails
    ? {
        total: rosterDetails.entries.length,
        submitted: rosterDetails.entries.filter((e) => e.hasSubmitted).length,
        missing: rosterDetails.entries.filter((e) => !e.hasSubmitted).length,
      }
    : null;

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Roster Management</h1>
          <p className="text-muted-foreground mt-1">
            Upload weekly driver rosters and track timesheet submissions
          </p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-roster">
              <Upload className="w-4 h-4 mr-2" />
              Upload Roster
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload Weekly Roster</DialogTitle>
              <DialogDescription>
                Upload a spreadsheet with driver assignments. Expected columns: Driver Name, Email, Phone, Expected Client
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="week-picker">Week Starting (Sunday)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-select-week"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(selectedWeek, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={selectedWeek}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedWeek(startOfWeek(date, { weekStartsOn: 0 }));
                        }
                      }}
                      weekStartsOn={0}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file-upload">Spreadsheet File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  data-testid="input-file-upload"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground" data-testid="text-selected-file">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this roster..."
                  data-testid="input-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                data-testid="button-confirm-upload"
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Rosters List */}
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Rosters</CardTitle>
            <CardDescription>
              {rosters?.length || 0} roster{rosters?.length !== 1 ? "s" : ""} uploaded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rosters && rosters.length > 0 ? (
              <div className="space-y-2">
                {rosters.map((roster) => (
                  <div
                    key={roster.id}
                    className={`p-4 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedRoster === roster.id ? "bg-accent border-accent-foreground" : ""
                    }`}
                    onClick={() => setSelectedRoster(roster.id)}
                    data-testid={`card-roster-${roster.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`text-roster-week-${roster.id}`}>
                            Week of {format(new Date(roster.weekStartDate), "MMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span data-testid={`text-roster-entries-${roster.id}`}>{roster.totalEntries} drivers</span>
                          </div>
                          <span data-testid={`text-roster-file-${roster.id}`} className="truncate">{roster.fileName}</span>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`button-delete-roster-${roster.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Roster</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this roster? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(roster.id)}
                              data-testid="button-confirm-delete"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No rosters uploaded yet</p>
                <p className="text-sm">Upload a roster to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Roster Details */}
        <Card>
          <CardHeader>
            <CardTitle>Roster Details</CardTitle>
            <CardDescription>
              {selectedRoster ? "Driver assignments and submission status" : "Select a roster to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rosterDetails && submissionStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold" data-testid="text-total-drivers">{submissionStats.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid="text-submitted-count">
                      {submissionStats.submitted}
                    </div>
                    <div className="text-xs text-muted-foreground">Submitted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600" data-testid="text-missing-count">
                      {submissionStats.missing}
                    </div>
                    <div className="text-xs text-muted-foreground">Missing</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Driver Status</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {rosterDetails.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 rounded-md border"
                        data-testid={`entry-${entry.id}`}
                      >
                        <div className="flex-1">
                          <div className="font-medium" data-testid={`text-driver-name-${entry.id}`}>
                            {entry.driverName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {entry.expectedClient && (
                              <span data-testid={`text-expected-client-${entry.id}`}>{entry.expectedClient}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          {entry.hasSubmitted ? (
                            <div className="flex items-center gap-1 text-green-600" data-testid={`status-submitted-${entry.id}`}>
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm">Submitted</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-orange-600" data-testid={`status-missing-${entry.id}`}>
                              <XCircle className="w-4 h-4" />
                              <span className="text-sm">Missing</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a roster to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
