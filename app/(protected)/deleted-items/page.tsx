'use client';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, RefreshCw, Users, FileText, Building2, Calendar } from "lucide-react";
import { format } from "date-fns";

interface DeletedItem {
  id: string;
  deletedAt: string;
  deletedBy: string;
  [key: string]: any;
}

export default function DeletedItems() {
  const queryClient = useQueryClient();
  
  const { data: deletedUsers, isLoading: loadingUsers } = useQuery<DeletedItem[]>({
    queryKey: ['/api/deleted/users'],
  });

  const { data: deletedTimesheets, isLoading: loadingTimesheets } = useQuery<DeletedItem[]>({
    queryKey: ['/api/deleted/timesheets'],
  });

  const { data: deletedClients, isLoading: loadingClients } = useQuery<DeletedItem[]>({
    queryKey: ['/api/deleted/clients'],
  });

  const { data: deletedRosters, isLoading: loadingRosters } = useQuery<DeletedItem[]>({
    queryKey: ['/api/deleted/rosters'],
  });

  const restoreUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/deleted/users/${id}/restore`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to restore user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deleted/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      alert("User restored successfully");
    },
    onError: () => {
      alert("Failed to restore user. Please try again.");
    },
  });

  const restoreTimesheetMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/deleted/timesheets/${id}/restore`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to restore timesheet');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deleted/timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] });
      alert("Timesheet restored successfully");
    },
    onError: () => {
      alert("Failed to restore timesheet. Please try again.");
    },
  });

  const restoreClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/deleted/clients/${id}/restore`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to restore client');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deleted/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      alert("Client restored successfully");
    },
    onError: () => {
      alert("Failed to restore client. Please try again.");
    },
  });

  const restoreRosterMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/deleted/rosters/${id}/restore`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to restore roster');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deleted/rosters'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rosters'] });
      alert("Roster restored successfully");
    },
    onError: () => {
      alert("Failed to restore roster. Please try again.");
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trash2 className="h-8 w-8 text-destructive" />
            Deleted Items
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and restore accidentally deleted items
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-deleted-users">
            <Users className="h-4 w-4" />
            Users {deletedUsers && `(${deletedUsers.length})`}
          </TabsTrigger>
          <TabsTrigger value="timesheets" className="flex items-center gap-2" data-testid="tab-deleted-timesheets">
            <FileText className="h-4 w-4" />
            Timesheets {deletedTimesheets && `(${deletedTimesheets.length})`}
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2" data-testid="tab-deleted-clients">
            <Building2 className="h-4 w-4" />
            Clients {deletedClients && `(${deletedClients.length})`}
          </TabsTrigger>
          <TabsTrigger value="rosters" className="flex items-center gap-2" data-testid="tab-deleted-rosters">
            <Calendar className="h-4 w-4" />
            Rosters {deletedRosters && `(${deletedRosters.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Deleted Users</CardTitle>
              <CardDescription>
                Users that have been soft-deleted can be restored
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading deleted users...
                </div>
              ) : !deletedUsers || deletedUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No deleted users found
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Deleted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`deleted-user-row-${user.id}`}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(user.deletedAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => restoreUserMutation.mutate(user.id)}
                              disabled={restoreUserMutation.isPending}
                              data-testid={`button-restore-user-${user.id}`}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timesheets Tab */}
        <TabsContent value="timesheets">
          <Card>
            <CardHeader>
              <CardTitle>Deleted Timesheets</CardTitle>
              <CardDescription>
                Timesheets that have been soft-deleted can be restored
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTimesheets ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading deleted timesheets...
                </div>
              ) : !deletedTimesheets || deletedTimesheets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No deleted timesheets found
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Week</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deleted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedTimesheets.map((timesheet) => (
                        <TableRow key={timesheet.id} data-testid={`deleted-timesheet-row-${timesheet.id}`}>
                          <TableCell className="font-medium">
                            {timesheet.driverName}
                          </TableCell>
                          <TableCell>
                            {format(new Date(timesheet.weekStartDate), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{timesheet.approvalStatus}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(timesheet.deletedAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => restoreTimesheetMutation.mutate(timesheet.id)}
                              disabled={restoreTimesheetMutation.isPending}
                              data-testid={`button-restore-timesheet-${timesheet.id}`}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Deleted Clients</CardTitle>
              <CardDescription>
                Clients that have been soft-deleted can be restored
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingClients ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading deleted clients...
                </div>
              ) : !deletedClients || deletedClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No deleted clients found
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Deleted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedClients.map((client) => (
                        <TableRow key={client.id} data-testid={`deleted-client-row-${client.id}`}>
                          <TableCell className="font-medium">
                            {client.companyName}
                          </TableCell>
                          <TableCell>{client.contactName}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(client.deletedAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => restoreClientMutation.mutate(client.id)}
                              disabled={restoreClientMutation.isPending}
                              data-testid={`button-restore-client-${client.id}`}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rosters Tab */}
        <TabsContent value="rosters">
          <Card>
            <CardHeader>
              <CardTitle>Deleted Rosters</CardTitle>
              <CardDescription>
                Rosters that have been soft-deleted can be restored
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRosters ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading deleted rosters...
                </div>
              ) : !deletedRosters || deletedRosters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No deleted rosters found
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week</TableHead>
                        <TableHead>Filename</TableHead>
                        <TableHead>Entries</TableHead>
                        <TableHead>Deleted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedRosters.map((roster) => (
                        <TableRow key={roster.id} data-testid={`deleted-roster-row-${roster.id}`}>
                          <TableCell className="font-medium">
                            {format(new Date(roster.weekStartDate), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{roster.fileName}</TableCell>
                          <TableCell>{roster.totalEntries}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(roster.deletedAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => restoreRosterMutation.mutate(roster.id)}
                              disabled={restoreRosterMutation.isPending}
                              data-testid={`button-restore-roster-${roster.id}`}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
