import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Eye, CheckCircle2, Mail, Users, FileText, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApprovalBatch, ApprovalAuditLog } from "@/shared/schema";

interface BatchConfirmationModalProps {
  batchId: string;
}

export function BatchConfirmationModal({ batchId }: BatchConfirmationModalProps) {
  const [open, setOpen] = useState(false);

  const { data: batch, isLoading: batchLoading } = useQuery<ApprovalBatch>({
    queryKey: [`/api/approval-batches/${batchId}`],
    enabled: open && !!batchId,
  });

  const { data: auditLogs = [], isLoading: logsLoading } = useQuery<ApprovalAuditLog[]>({
    queryKey: [`/api/approval-batches/${batchId}/audit-log`],
    enabled: open && !!batchId,
  });

  const isLoading = batchLoading || logsLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="w-4 h-4 mr-2" />
          View Confirmation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Confirmation Details</DialogTitle>
          <DialogDescription>
            Complete audit trail and authentication information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-3/4 mb-2 animate-pulse"></div>
            <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
          </div>
        ) : batch ? (
          <div className="space-y-6">
            {/* Batch Summary */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Batch Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{batch.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Week</p>
                    <p className="font-medium">
                      {batch.weekStartDate ? format(parseISO(batch.weekStartDate), "MMM d, yyyy") : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={batch.status === 'approved' ? 'default' : 'secondary'}>
                      {batch.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sent To</p>
                    <p className="font-medium text-sm">{batch.sentToEmail || '—'}</p>
                  </div>
                  {batch.sentAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Sent At</p>
                      <p className="font-medium text-sm">
                        {format(new Date(batch.sentAt), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  )}
                  {batch.createdAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Created At</p>
                      <p className="font-medium text-sm">
                        {format(new Date(batch.createdAt), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Audit Trail */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Audit Trail</CardTitle>
                <CardDescription>Activity log with authentication details</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No audit logs found</p>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="border-l-2 border-primary pl-4 py-2">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {log.action === 'approved' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                            {log.action === 'link_sent' && <Mail className="w-4 h-4 text-blue-600" />}
                            {log.action === 'link_opened' && <Eye className="w-4 h-4 text-yellow-600" />}
                            <p className="font-medium text-sm capitalize">{log.action.replace('_', ' ')}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.timestamp), "MMM d, h:mm a")}
                          </p>
                        </div>
                        {log.performedBy && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>By: {log.performedBy}</span>
                          </div>
                        )}
                        {log.userAgent && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1" title={log.userAgent}>
                            <Smartphone className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{log.userAgent}</span>
                          </div>
                        )}
                        {log.notes && (
                          <div className="flex items-start gap-1 text-sm mt-1 bg-muted/50 p-2 rounded">
                            <FileText className="w-3 h-3 mt-1" />
                            <p>{log.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">Batch information not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
