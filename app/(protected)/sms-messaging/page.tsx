'use client';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, Send, Users, CheckSquare, Square, AlertTriangle } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
}

export default function SMSMessaging() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const drivers = users.filter((user) => user.role === "driver");

  const filteredDrivers = drivers.filter((driver) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${driver.firstName || ""} ${driver.lastName || ""}`.toLowerCase();
    const email = driver.email?.toLowerCase() || "";
    const phone = driver.phone?.toLowerCase() || "";
    return fullName.includes(query) || email.includes(query) || phone.includes(query);
  });

  const driversWithPhone = filteredDrivers.filter((driver) => driver.phone);
  const driversWithoutPhone = filteredDrivers.filter((driver) => !driver.phone);

  const handleSelectAll = () => {
    const allDriverIds = new Set(driversWithPhone.map((d) => d.id));
    setSelectedDrivers(allDriverIds);
  };

  const handleDeselectAll = () => {
    setSelectedDrivers(new Set());
  };

  const handleToggleDriver = (driverId: string) => {
    const newSelected = new Set(selectedDrivers);
    if (newSelected.has(driverId)) {
      newSelected.delete(driverId);
    } else {
      newSelected.add(driverId);
    }
    setSelectedDrivers(newSelected);
  };

  const handleSend = () => {
    // DISABLED: Test mode only - no actual SMS sending
    alert("Test Mode: SMS sending is disabled. No messages were sent.");
  };

  const remainingChars = 160 - message.length;
  const segmentCount = Math.ceil(message.length / 160) || 1;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SMS Messaging</h1>
        <p className="text-muted-foreground">Send text messages to drivers</p>
      </div>

      {/* TEST MODE WARNING */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 rounded-xl border shadow-sm p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">Test Mode</p>
            <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
              SMS functionality is currently disabled for testing. No actual messages will be sent when you click Send.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Drivers
            </CardTitle>
            <CardDescription>
              Choose which drivers to send the message to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-drivers"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={driversWithPhone.length === 0}
                data-testid="button-select-all"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select All ({driversWithPhone.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                disabled={selectedDrivers.size === 0}
                data-testid="button-deselect-all"
              >
                <Square className="h-4 w-4 mr-2" />
                Deselect All
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading drivers...
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {driversWithPhone.length > 0 && (
                  <div className="space-y-2">
                    {driversWithPhone.map((driver) => (
                      <div
                        key={driver.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => handleToggleDriver(driver.id)}
                        data-testid={`driver-item-${driver.id}`}
                      >
                        <Checkbox
                          checked={selectedDrivers.has(driver.id)}
                          onCheckedChange={() => handleToggleDriver(driver.id)}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`checkbox-driver-${driver.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate" data-testid={`text-driver-name-${driver.id}`}>
                            {driver.firstName} {driver.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {driver.phone}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {driver.email}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {driversWithoutPhone.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Drivers without phone numbers
                    </p>
                    {driversWithoutPhone.map((driver) => (
                      <div
                        key={driver.id}
                        className="flex items-center gap-3 p-3 rounded-lg border opacity-50"
                        data-testid={`driver-no-phone-${driver.id}`}
                      >
                        <Checkbox disabled checked={false} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {driver.firstName} {driver.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            No phone number
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {driver.email}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {filteredDrivers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No drivers found
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedDrivers.size} driver{selectedDrivers.size !== 1 ? "s" : ""} selected
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Compose Message
              </CardTitle>
              <CardDescription>
                Write your message to send to selected drivers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="resize-none"
                  data-testid="textarea-message"
                />
                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                  <span>
                    {message.length} characters ({segmentCount} SMS{segmentCount !== 1 ? " segments" : " segment"})
                  </span>
                  <span className={remainingChars < 0 ? "text-destructive" : ""}>
                    {remainingChars} remaining in segment
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSend}
                disabled={selectedDrivers.size === 0 || !message.trim()}
                className="w-full"
                data-testid="button-send-sms"
              >
                <Send className="h-4 w-4 mr-2" />
                Send to {selectedDrivers.size} driver{selectedDrivers.size !== 1 ? "s" : ""} (Test Mode)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
