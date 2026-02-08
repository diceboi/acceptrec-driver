"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTimesheetSchema, type InsertTimesheet, type Timesheet } from "@/shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TimeSelect } from "@/components/ui/time-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { useEffect } from "react";
import { ClientAutocomplete } from "@/components/client-autocomplete";

interface EditDialogProps {
  timesheet: Timesheet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DayFields = {
  clientField: keyof InsertTimesheet;
  startField: keyof InsertTimesheet;
  endField: keyof InsertTimesheet;
  breakField: keyof InsertTimesheet;
  poaField: keyof InsertTimesheet;
  otherWorkField: keyof InsertTimesheet;
  totalField: keyof InsertTimesheet;
  nightOutField: keyof InsertTimesheet;
  reviewField: keyof InsertTimesheet;
};

// Handles overnight shifts (e.g., 22:00 to 08:00 = 10 hours)
const calculateHours = (startTime: string, endTime: string, breakTime: string): string => {
  if (!startTime || !endTime) {
    return "0";
  }

  try {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;

    // Handle overnight shifts - if end time is before start time, add 24 hours
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Add 1440 minutes (24 hours)
    }

    // Break is now in minutes (plain number)
    let breakMinutes = 0;
    if (breakTime) {
      breakMinutes = parseFloat(breakTime) || 0;
    }

    const workedMinutes = endMinutes - startMinutes - breakMinutes;

    if (workedMinutes < 0) {
      return "0";
    }

    return (workedMinutes / 60).toFixed(2);
  } catch (error) {
    return "0";
  }
};

export default function EditDialog({ timesheet, open, onOpenChange }: EditDialogProps) {
  const queryClient = useQueryClient();
  const weekStart = parseISO(timesheet.weekStartDate);

  const daysOfWeek: Array<{ name: string; date: Date; fields: DayFields }> = [
    {
      name: "Sunday",
      date: weekStart,
      fields: {
        clientField: "sundayClient",
        startField: "sundayStart",
        endField: "sundayEnd",
        breakField: "sundayBreak",
        poaField: "sundayPoa",
        otherWorkField: "sundayOtherWork",
        totalField: "sundayTotal",
        nightOutField: "sundayNightOut",
        reviewField: "sundayReview",
      },
    },
    {
      name: "Monday",
      date: addDays(weekStart, 1),
      fields: {
        clientField: "mondayClient",
        startField: "mondayStart",
        endField: "mondayEnd",
        breakField: "mondayBreak",
        poaField: "mondayPoa",
        otherWorkField: "mondayOtherWork",
        totalField: "mondayTotal",
        nightOutField: "mondayNightOut",
        reviewField: "mondayReview",
      },
    },
    {
      name: "Tuesday",
      date: addDays(weekStart, 2),
      fields: {
        clientField: "tuesdayClient",
        startField: "tuesdayStart",
        endField: "tuesdayEnd",
        breakField: "tuesdayBreak",
        poaField: "tuesdayPoa",
        otherWorkField: "tuesdayOtherWork",
        totalField: "tuesdayTotal",
        nightOutField: "tuesdayNightOut",
        reviewField: "tuesdayReview",
      },
    },
    {
      name: "Wednesday",
      date: addDays(weekStart, 3),
      fields: {
        clientField: "wednesdayClient",
        startField: "wednesdayStart",
        endField: "wednesdayEnd",
        breakField: "wednesdayBreak",
        poaField: "wednesdayPoa",
        otherWorkField: "wednesdayOtherWork",
        totalField: "wednesdayTotal",
        nightOutField: "wednesdayNightOut",
        reviewField: "wednesdayReview",
      },
    },
    {
      name: "Thursday",
      date: addDays(weekStart, 4),
      fields: {
        clientField: "thursdayClient",
        startField: "thursdayStart",
        endField: "thursdayEnd",
        breakField: "thursdayBreak",
        poaField: "thursdayPoa",
        otherWorkField: "thursdayOtherWork",
        totalField: "thursdayTotal",
        nightOutField: "thursdayNightOut",
        reviewField: "thursdayReview",
      },
    },
    {
      name: "Friday",
      date: addDays(weekStart, 5),
      fields: {
        clientField: "fridayClient",
        startField: "fridayStart",
        endField: "fridayEnd",
        breakField: "fridayBreak",
        poaField: "fridayPoa",
        otherWorkField: "fridayOtherWork",
        totalField: "fridayTotal",
        nightOutField: "fridayNightOut",
        reviewField: "fridayReview",
      },
    },
    {
      name: "Saturday",
      date: addDays(weekStart, 6),
      fields: {
        clientField: "saturdayClient",
        startField: "saturdayStart",
        endField: "saturdayEnd",
        breakField: "saturdayBreak",
        poaField: "saturdayPoa",
        otherWorkField: "saturdayOtherWork",
        totalField: "saturdayTotal",
        nightOutField: "saturdayNightOut",
        reviewField: "saturdayReview",
      },
    },
  ];

  const getDefaultValues = () => {
    const defaults: any = {
      driverName: timesheet.driverName,
      weekStartDate: timesheet.weekStartDate,
    };

    daysOfWeek.forEach(day => {
      defaults[day.fields.clientField] = timesheet[day.fields.clientField as keyof Timesheet] || "";
      defaults[day.fields.startField] = timesheet[day.fields.startField as keyof Timesheet] || "";
      defaults[day.fields.endField] = timesheet[day.fields.endField as keyof Timesheet] || "";
      defaults[day.fields.breakField] = timesheet[day.fields.breakField as keyof Timesheet] || "";
      defaults[day.fields.poaField] = timesheet[day.fields.poaField as keyof Timesheet] || "0";
      defaults[day.fields.otherWorkField] = timesheet[day.fields.otherWorkField as keyof Timesheet] || "0";
      defaults[day.fields.totalField] = timesheet[day.fields.totalField as keyof Timesheet] || "0";
      defaults[day.fields.nightOutField] = timesheet[day.fields.nightOutField as keyof Timesheet] || "false";
      defaults[day.fields.reviewField] = timesheet[day.fields.reviewField as keyof Timesheet] || "";
    });

    return defaults as InsertTimesheet;
  };

  const form = useForm<InsertTimesheet>({
    resolver: zodResolver(insertTimesheetSchema) as any,
    defaultValues: getDefaultValues(),
  });

  // Auto-calculate total working time for Monday
  const mondayStart = form.watch("mondayStart");
  const mondayEnd = form.watch("mondayEnd");
  const mondayBreak = form.watch("mondayBreak");
  useEffect(() => {
    const total = calculateHours(mondayStart, mondayEnd, mondayBreak);
    form.setValue("mondayTotal", total);
  }, [mondayStart, mondayEnd, mondayBreak, form]);

  // Auto-calculate total working time for Tuesday
  const tuesdayStart = form.watch("tuesdayStart");
  const tuesdayEnd = form.watch("tuesdayEnd");
  const tuesdayBreak = form.watch("tuesdayBreak");
  useEffect(() => {
    const total = calculateHours(tuesdayStart, tuesdayEnd, tuesdayBreak);
    form.setValue("tuesdayTotal", total);
  }, [tuesdayStart, tuesdayEnd, tuesdayBreak, form]);

  // Auto-calculate total working time for Wednesday
  const wednesdayStart = form.watch("wednesdayStart");
  const wednesdayEnd = form.watch("wednesdayEnd");
  const wednesdayBreak = form.watch("wednesdayBreak");
  useEffect(() => {
    const total = calculateHours(wednesdayStart, wednesdayEnd, wednesdayBreak);
    form.setValue("wednesdayTotal", total);
  }, [wednesdayStart, wednesdayEnd, wednesdayBreak, form]);

  // Auto-calculate total working time for Thursday
  const thursdayStart = form.watch("thursdayStart");
  const thursdayEnd = form.watch("thursdayEnd");
  const thursdayBreak = form.watch("thursdayBreak");
  useEffect(() => {
    const total = calculateHours(thursdayStart, thursdayEnd, thursdayBreak);
    form.setValue("thursdayTotal", total);
  }, [thursdayStart, thursdayEnd, thursdayBreak, form]);

  // Auto-calculate total working time for Friday
  const fridayStart = form.watch("fridayStart");
  const fridayEnd = form.watch("fridayEnd");
  const fridayBreak = form.watch("fridayBreak");
  useEffect(() => {
    const total = calculateHours(fridayStart, fridayEnd, fridayBreak);
    form.setValue("fridayTotal", total);
  }, [fridayStart, fridayEnd, fridayBreak, form]);

  // Auto-calculate total working time for Saturday
  const saturdayStart = form.watch("saturdayStart");
  const saturdayEnd = form.watch("saturdayEnd");
  const saturdayBreak = form.watch("saturdayBreak");
  useEffect(() => {
    const total = calculateHours(saturdayStart, saturdayEnd, saturdayBreak);
    form.setValue("saturdayTotal", total);
  }, [saturdayStart, saturdayEnd, saturdayBreak, form]);

  // Auto-calculate total working time for Sunday
  const sundayStart = form.watch("sundayStart");
  const sundayEnd = form.watch("sundayEnd");
  const sundayBreak = form.watch("sundayBreak");
  useEffect(() => {
    const total = calculateHours(sundayStart, sundayEnd, sundayBreak);
    form.setValue("sundayTotal", total);
  }, [sundayStart, sundayEnd, sundayBreak, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: InsertTimesheet) => {
      // In EditDialog, we are editing a timesheet by ID, simple update
      return await apiRequest("PATCH", `/api/timesheets/${timesheet.id}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      onOpenChange(false);
      toast.success("Success", {
        description: "Timesheet updated successfully",
      });
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message || "Failed to update timesheet",
      });
    },
  });

  const onSubmit = (data: InsertTimesheet) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]" data-testid="dialog-edit">
        <DialogHeader>
          <DialogTitle>Edit Weekly Timesheet</DialogTitle>
          <DialogDescription>
            Update the weekly schedule and client assignments
          </DialogDescription>
        </DialogHeader>

        {(timesheet.approvalStatus === 'approved' || timesheet.clientApprovedAt) && (
          <Alert variant="destructive" className="mt-4" data-testid="alert-edit-approved">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This timesheet has been approved by a client.
              Editing it will remove the client's approval, rating, comments, and any time corrections they made.
              The timesheet will need to be re-submitted for approval.
            </AlertDescription>
          </Alert>
        )}

        {timesheet.approvalStatus === 'rejected' && timesheet.clientComments && (
          <Alert variant="destructive" className="mt-4" data-testid="alert-edit-rejected">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Rejected by {timesheet.clientApprovedBy || 'client'}:</strong>
              <div className="mt-2 text-sm">
                {timesheet.clientComments}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-[60vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="driverName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-driver-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                {daysOfWeek.map((day) => (
                  <Card key={day.name} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          {day.name}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {format(day.date, 'MMM d')}
                        </span>
                      </div>

                      <FormField
                        control={form.control}
                        name={day.fields.clientField as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Client Name</FormLabel>
                            <FormControl>
                              <ClientAutocomplete
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Type 3+ letters to search"
                                data-testid={`input-edit-${day.name.toLowerCase()}-client`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-3">
                        <FormField
                          control={form.control}
                          name={day.fields.startField as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Start Time</FormLabel>
                              <FormControl>
                                <TimeSelect
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  placeholder="Start"
                                  data-testid={`input-edit-${day.name.toLowerCase()}-start`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={day.fields.endField as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">End Time</FormLabel>
                              <FormControl>
                                <TimeSelect
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  placeholder="End"
                                  data-testid={`input-edit-${day.name.toLowerCase()}-end`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={day.fields.breakField as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Break (mins)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max="60"
                                  placeholder="0"
                                  {...field}
                                  data-testid={`input-edit-${day.name.toLowerCase()}-break`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <FormField
                          control={form.control}
                          name={day.fields.poaField as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">POA (hours)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="24"
                                  {...field}
                                  data-testid={`input-edit-${day.name.toLowerCase()}-poa`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={day.fields.otherWorkField as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Other Work (hours)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="24"
                                  {...field}
                                  data-testid={`input-edit-${day.name.toLowerCase()}-other`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={day.fields.totalField as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Total (hours)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
                                  data-testid={`input-edit-${day.name.toLowerCase()}-total`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={day.fields.nightOutField as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value === "true"}
                                onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                                data-testid={`checkbox-edit-${day.name.toLowerCase()}-nightout`}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-xs cursor-pointer">
                                Night Out 🌙
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Check if driver stayed out overnight for this shift
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={day.fields.reviewField as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Client Review / Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Add notes or review for this client..."
                                className="resize-none"
                                rows={2}
                                {...field}
                                data-testid={`input-edit-${day.name.toLowerCase()}-review`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
