'use client';

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Clock, Filter, X, Search, Users, Building2, UserCheck } from "lucide-react";
import { format } from "date-fns";

interface SystemAuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  notes: string | null;
  timestamp: string;
}

export default function AuditLog() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [actorFilter, setActorFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery<SystemAuditLog[]>({
    queryKey: ['/api/audit-logs'],
  });

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create':
        return 'default';
      case 'update':
      case 'profile_update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      case 'restore':
        return 'default';
      case 'role_change':
        return 'secondary';
      case 'login':
        return 'outline';
      case 'submit':
        return 'default';
      case 'approve':
        return 'default';
      case 'reject':
        return 'destructive';
      case 'send':
        return 'secondary';
      case 'view':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getEntityBadgeVariant = (entityType: string) => {
    switch (entityType) {
      case 'user':
        return 'default';
      case 'timesheet':
        return 'secondary';
      case 'client':
        return 'secondary';
      case 'roster':
        return 'secondary';
      case 'approval_batch':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getActorType = (log: SystemAuditLog): string => {
    if (log.entityType === 'approval_batch' && log.action === 'approve') {
      return 'client';
    }
    if (log.entityType === 'approval_batch' && log.action === 'reject') {
      return 'client';
    }
    if (log.entityType === 'approval_batch' && log.action === 'view' && !log.userId) {
      return 'client';
    }
    if (log.entityType === 'timesheet' && log.action === 'submit') {
      return 'driver';
    }
    if (log.entityType === 'timesheet' && log.action === 'create') {
      return 'driver';
    }
    return 'employee';
  };

  const uniqueActions = useMemo(() => {
    if (!logs) return [];
    const actions = Array.from(new Set(logs.map(log => log.action).filter(Boolean)));
    return actions.sort();
  }, [logs]);

  const uniqueEntityTypes = useMemo(() => {
    if (!logs) return [];
    const types = Array.from(new Set(logs.map(log => log.entityType).filter(Boolean)));
    return types.sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    return logs.filter(log => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (entityFilter !== "all" && log.entityType !== entityFilter) return false;
      
      if (actorFilter !== "all") {
        const actorType = getActorType(log);
        if (actorType !== actorFilter) return false;
      }
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesUser = log.userName?.toLowerCase().includes(search) || 
                           log.userEmail?.toLowerCase().includes(search);
        const matchesEntity = log.entityName?.toLowerCase().includes(search);
        const matchesNotes = log.notes?.toLowerCase().includes(search);
        if (!matchesUser && !matchesEntity && !matchesNotes) return false;
      }
      
      return true;
    });
  }, [logs, actionFilter, entityFilter, actorFilter, searchTerm]);

  const clearFilters = () => {
    setActionFilter("all");
    setEntityFilter("all");
    setActorFilter("all");
    setSearchTerm("");
  };

  const hasFilters = actionFilter !== "all" || entityFilter !== "all" || actorFilter !== "all" || searchTerm !== "";

  const stats = useMemo(() => {
    if (!logs) return { total: 0, today: 0, drivers: 0, clients: 0, employees: 0 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayCount = 0;
    let driverCount = 0;
    let clientCount = 0;
    let employeeCount = 0;
    
    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      if (logDate >= today) todayCount++;
      
      const actorType = getActorType(log);
      if (actorType === 'driver') driverCount++;
      else if (actorType === 'client') clientCount++;
      else employeeCount++;
    });
    
    return { total: logs.length, today: todayCount, drivers: driverCount, clients: clientCount, employees: employeeCount };
  }, [logs]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            System Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete trail of all system actions for compliance and troubleshooting
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div className="text-2xl font-bold">{stats.drivers}</div>
            </div>
            <p className="text-xs text-muted-foreground">Driver Actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-500" />
              <div className="text-2xl font-bold">{stats.clients}</div>
            </div>
            <p className="text-xs text-muted-foreground">Client Actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-500" />
              <div className="text-2xl font-bold">{stats.employees}</div>
            </div>
            <p className="text-xs text-muted-foreground">Employee Actions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="User, entity, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-audit"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Actor Type</Label>
              <Select value={actorFilter} onValueChange={setActorFilter}>
                <SelectTrigger data-testid="select-actor-filter">
                  <SelectValue placeholder="All actors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actors</SelectItem>
                  <SelectItem value="driver">Drivers</SelectItem>
                  <SelectItem value="client">Clients</SelectItem>
                  <SelectItem value="employee">Employees (Admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger data-testid="select-action-filter">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action?.replace('_', ' ') || action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger data-testid="select-entity-filter">
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {uniqueEntityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type?.replace('_', ' ') || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters} className="w-full" data-testid="button-clear-filters">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            {filteredLogs.length} of {logs?.length || 0} events
            {hasFilters && " (filtered)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading audit logs...
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No logs match your filters
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const actorType = getActorType(log);
                    return (
                      <TableRow key={log.id} data-testid={`audit-log-row-${log.id}`}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm">
                              <div className="font-medium">
                                {format(new Date(log.timestamp), 'MMM d, yyyy')}
                              </div>
                              <div className="text-muted-foreground">
                                {format(new Date(log.timestamp), 'h:mm a')}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium flex items-center gap-2">
                              {log.userName || 'Unknown'}
                              <Badge variant="outline" className="text-xs">
                                {actorType}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground">{log.userEmail || '-'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getActionBadgeVariant(log.action) as any}
                            data-testid={`badge-action-${log.action}`}
                          >
                            {log.action?.replace('_', ' ') || log.action || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getEntityBadgeVariant(log.entityType) as any}
                            data-testid={`badge-entity-${log.entityType}`}
                          >
                            {log.entityType?.replace('_', ' ') || log.entityType || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm max-w-xs truncate" title={log.entityName || '-'}>
                            {log.entityName || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-md">
                            {log.notes || '-'}
                            {log.changes && (
                              <div className="mt-1 font-mono text-xs bg-muted p-2 rounded max-h-20 overflow-auto">
                                {JSON.stringify(log.changes, null, 2)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
