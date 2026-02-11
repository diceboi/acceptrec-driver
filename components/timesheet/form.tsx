"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTimesheetSchema, type InsertTimesheet } from "@/shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
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
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfWeek, addDays, subWeeks, parseISO } from "date-fns";
import { useEffect, useState, useMemo } from "react";
import { Calendar, Upload } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { ClientAutocomplete } from "@/components/client-autocomplete";

type DayFields = {
  clientField: keyof InsertTimesheet;
  startField: keyof InsertTimesheet;
  endField: keyof InsertTimesheet;
  breakField: keyof InsertTimesheet;
  poaField: keyof InsertTimesheet;
  otherWorkField: keyof InsertTimesheet;
  totalField: keyof InsertTimesheet;
  reviewField: keyof InsertTimesheet;
  nightOutField: keyof InsertTimesheet;
  disableMinHoursField: keyof InsertTimesheet;
  expenseAmountField: keyof InsertTimesheet;
  expenseReceiptField: keyof InsertTimesheet;
  driverRatingField: keyof InsertTimesheet;
  driverCommentsField: keyof InsertTimesheet;
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
    
    // Break is now in minutes (plain number, not HH:mm format)
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

export default function TimesheetForm() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
  
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday as start of week
    
    // Generate available weeks (current week + 4 previous weeks)
    const availableWeeks = useMemo(() => {
      const weeks = [];
      for (let i = 0; i < 5; i++) {
        const weekDate = subWeeks(currentWeekStart, i);
        weeks.push({
          value: format(weekDate, 'yyyy-MM-dd'),
          label: i === 0 
            ? `This Week (${format(weekDate, 'MMM d, yyyy')})`
            : `${format(weekDate, 'MMM d, yyyy')}`
        });
      }
      return weeks;
    }, [currentWeekStart]);
  
    // State for selected week
    const [selectedWeek, setSelectedWeek] = useState(availableWeeks[0].value);
    const weekStart = parseISO(selectedWeek);
  
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
          reviewField: "sundayReview",
          nightOutField: "sundayNightOut",
          disableMinHoursField: "sundayDisableMinHours",
          expenseAmountField: "sundayExpenseAmount",
          expenseReceiptField: "sundayExpenseReceipt",
          driverRatingField: "sundayDriverRating",
          driverCommentsField: "sundayDriverComments",
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
          reviewField: "mondayReview",
          nightOutField: "mondayNightOut",
          disableMinHoursField: "mondayDisableMinHours",
          expenseAmountField: "mondayExpenseAmount",
          expenseReceiptField: "mondayExpenseReceipt",
          driverRatingField: "mondayDriverRating",
          driverCommentsField: "mondayDriverComments",
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
          reviewField: "tuesdayReview",
          nightOutField: "tuesdayNightOut",
          disableMinHoursField: "tuesdayDisableMinHours",
          expenseAmountField: "tuesdayExpenseAmount",
          expenseReceiptField: "tuesdayExpenseReceipt",
          driverRatingField: "tuesdayDriverRating",
          driverCommentsField: "tuesdayDriverComments",
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
          reviewField: "wednesdayReview",
          nightOutField: "wednesdayNightOut",
          disableMinHoursField: "wednesdayDisableMinHours",
          expenseAmountField: "wednesdayExpenseAmount",
          expenseReceiptField: "wednesdayExpenseReceipt",
          driverRatingField: "wednesdayDriverRating",
          driverCommentsField: "wednesdayDriverComments",
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
          reviewField: "thursdayReview",
          nightOutField: "thursdayNightOut",
          disableMinHoursField: "thursdayDisableMinHours",
          expenseAmountField: "thursdayExpenseAmount",
          expenseReceiptField: "thursdayExpenseReceipt",
          driverRatingField: "thursdayDriverRating",
          driverCommentsField: "thursdayDriverComments",
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
          reviewField: "fridayReview",
          nightOutField: "fridayNightOut",
          disableMinHoursField: "fridayDisableMinHours",
          expenseAmountField: "fridayExpenseAmount",
          expenseReceiptField: "fridayExpenseReceipt",
          driverRatingField: "fridayDriverRating",
          driverCommentsField: "fridayDriverComments",
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
          reviewField: "saturdayReview",
          nightOutField: "saturdayNightOut",
          disableMinHoursField: "saturdayDisableMinHours",
          expenseAmountField: "saturdayExpenseAmount",
          expenseReceiptField: "saturdayExpenseReceipt",
          driverRatingField: "saturdayDriverRating",
          driverCommentsField: "saturdayDriverComments",
        },
      },
    ];
  
    const getDefaultValues = () => {
      const driverName = user?.user_metadata?.full_name 
        ? user.user_metadata.full_name
        : user?.email || "";
      
      const defaults: any = {
        driverName,
        weekStartDate: format(weekStart, 'yyyy-MM-dd'),
      };
  
      daysOfWeek.forEach(day => {
        defaults[day.fields.clientField] = "";
        defaults[day.fields.startField] = "";
        defaults[day.fields.endField] = "";
        defaults[day.fields.breakField] = "";
        defaults[day.fields.poaField] = "0";
        defaults[day.fields.otherWorkField] = "0";
        defaults[day.fields.totalField] = "0";
        defaults[day.fields.reviewField] = "";
        defaults[day.fields.nightOutField] = "false";
        defaults[day.fields.disableMinHoursField] = false;
        defaults[day.fields.expenseAmountField] = "";
        defaults[day.fields.expenseReceiptField] = "";
        defaults[day.fields.driverRatingField] = undefined;
        defaults[day.fields.driverCommentsField] = "";
      });
  
      // Type assertion because we are building it dynamically
      return defaults as unknown as InsertTimesheet;
    };
  
    const form = useForm<InsertTimesheet>({
      resolver: zodResolver(insertTimesheetSchema) as any,
      defaultValues: getDefaultValues(),
    });
  
    // Update driver name when user loads
    useEffect(() => {
      if (user) {
        // Use full_name from metadata or email
        const driverName = user.user_metadata?.full_name || user.email || "";
        // Only set if field is empty or just initialized
        if (!form.getValues("driverName")) {
             form.setValue("driverName", driverName);
        }
      }
    }, [user, form]);
  
    // Update week start date when week selection changes
    useEffect(() => {
      form.setValue("weekStartDate", selectedWeek);
    }, [selectedWeek, form]);
  
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
  
    const createMutation = useMutation({
      mutationFn: async (data: InsertTimesheet) => {
        return await apiRequest("POST", "/api/timesheets", data);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
        // form.reset(getDefaultValues()); // Resetting might clear the user name too if not careful
        // Recalculate default values or at least reset inputs
        toast.success("Success", {
          description: "Weekly timesheet submitted successfully",
        });
      },
      onError: (error: Error) => {
        toast.error("Error", {
          description: error.message || "Failed to submit timesheet",
        });
      },
    });
  
    const onSubmit = (data: InsertTimesheet) => {
      createMutation.mutate(data);
    };
  
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="driverName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Driver Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter driver name"
                    {...field}
                    disabled={!!user}
                    data-testid="input-driver-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
  
          <div>
            <FormLabel>Week Commencing</FormLabel>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-full" data-testid="select-week">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableWeeks.map(week => (
                  <SelectItem key={week.value} value={week.value}>
                    {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Select the week you're submitting hours for
            </p>
          </div>
  
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">
              Daily Time Tracking
            </h3>
            <p className="text-xs text-muted-foreground">
              Enter detailed time tracking for each day
            </p>
          </div>
  
          <div className="grid grid-cols-1 gap-4">
            {daysOfWeek.map((day) => (
              <Card key={day.name} className="p-4" data-testid={`card-${day.name.toLowerCase()}`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-3">
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
                            data-testid={`input-${day.name.toLowerCase()}-client`}
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
                              data-testid={`input-${day.name.toLowerCase()}-start`}
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
                              data-testid={`input-${day.name.toLowerCase()}-end`}
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
                              data-testid={`input-${day.name.toLowerCase()}-break`}
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
                              placeholder="0"
                              {...field}
                              data-testid={`input-${day.name.toLowerCase()}-poa`}
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
                              placeholder="0"
                              {...field}
                              data-testid={`input-${day.name.toLowerCase()}-other`}
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
                              type="text"
                              readOnly
                              className="bg-muted cursor-not-allowed"
                              {...field}
                              data-testid={`input-${day.name.toLowerCase()}-total`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
  
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
                            data-testid={`input-${day.name.toLowerCase()}-review`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
  
                  <div className="pt-3 border-t">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <FormField
                        control={form.control}
                        name={day.fields.nightOutField as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value === "true"}
                                onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                                data-testid={`checkbox-${day.name.toLowerCase()}-night-out`}
                              />
                            </FormControl>
                            <FormLabel className="text-xs font-normal cursor-pointer">
                              Night Out (driver stayed overnight)
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      {(user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'super_admin') && (
                        <FormField
                          control={form.control}
                          name={day.fields.disableMinHoursField as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid={`checkbox-${day.name.toLowerCase()}-disable-min-ours`}
                                />
                              </FormControl>
                              <FormLabel className="text-xs font-normal cursor-pointer">
                                Disable Min Hours
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
  
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <FormField
                        control={form.control}
                        name={day.fields.expenseAmountField as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Expense Amount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                {...field}
                                data-testid={`input-${day.name.toLowerCase()}-expense-amount`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
  
                      <FormField
                        control={form.control}
                        name={day.fields.expenseReceiptField as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Receipt Photo</FormLabel>
                            <div className="flex items-center gap-2">
                              {field.value && (
                                <span className="text-xs text-muted-foreground truncate flex-1">
                                  {field.value.split('/').pop()}
                                </span>
                              )}
                              <ObjectUploader
                                maxNumberOfFiles={1}
                                maxFileSize={10485760}
                                buttonVariant="outline"
                                buttonClassName="shrink-0"
                                onGetUploadParameters={async () => {
                                  const response = await apiRequest("POST", "/api/objects/upload", {});
                                  const data = await response.json();
                                  return {
                                    method: "PUT" as const,
                                    url: data.url, // Original code used data.uploadURL, but my API returns data.url
                                  };
                                }}
                                onComplete={async (result) => {
                                  try {
                                    if (!result.successful || result.successful.length === 0) {
                                      toast.error("Upload Failed", { description: "No files were successfully uploaded." });
                                      field.onChange("");
                                      return;
                                    }
  
                                    const file = result.successful[0];
                                    const uploadURL = (file as any).uploadURL || file.meta?.uploadURL;
                                    
                                    if (!uploadURL) {
                                      toast.error("Upload Error", { description: "Could not determine uploaded file location." });
                                      field.onChange("");
                                      return;
                                    }
                                    
                                    const response = await apiRequest("PUT", "/api/receipts", {
                                      receiptURL: uploadURL,
                                    });
                                    
                                    if (!response.ok) {
                                      const errorData = await response.json();
                                      throw new Error(errorData.error || "Failed to finalize receipt upload");
                                    }
                                    
                                    const data = await response.json();
                                    field.onChange(data.objectPath);
                                    
                                    toast.success("Receipt Uploaded");
                                  } catch (error) {
                                    field.onChange("");
                                    toast.error("Upload Failed", { description: error instanceof Error ? error.message : "Failed to complete upload" });
                                  }
                                }}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                {field.value ? "Change Photo" : "Upload Photo"}
                              </ObjectUploader>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
  
                    <div className="mt-4 pt-3 border-t bg-muted/20 -mx-4 px-4 pb-3">
                      <div className="mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Rate This Client (Optional)</p>
                        <p className="text-xs text-muted-foreground/80">Private feedback only visible to administrators</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={day.fields.driverRatingField as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Rating (1-10)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  max="10"
                                  placeholder="Rate 1-10"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                                  value={field.value ?? ''}
                                  data-testid={`input-${day.name.toLowerCase()}-driver-rating`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
  
                        <FormField
                          control={form.control}
                          name={day.fields.driverCommentsField as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Feedback</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Comments about client..."
                                  {...field}
                                  value={field.value || ''}
                                  data-testid={`input-${day.name.toLowerCase()}-driver-comments`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
  
          <Button
            type="submit"
            className="w-full"
            disabled={createMutation.isPending}
            data-testid="button-submit"
          >
            {createMutation.isPending ? "Submitting..." : "Submit Weekly Timesheet"}
          </Button>
        </form>
      </Form>
    );
  }
