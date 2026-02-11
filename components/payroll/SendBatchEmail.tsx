import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Client } from "@/shared/schema";

interface SendBatchEmailProps {
  batchId: string;
  clientName: string;
}

export function SendBatchEmail({ batchId, clientName }: SendBatchEmailProps) {
  const [open, setOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Filter clients by matching name (case-insensitive)
  // This logic is ported from legacy code to handle free-text client names in timesheets
  const matchingClients = clients.filter(c => 
    c.companyName.toLowerCase().includes(clientName.toLowerCase()) ||
    clientName.toLowerCase().includes(c.companyName.toLowerCase())
  );

  const sendEmailMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await fetch(`/api/approval-batches/${batchId}/send-email`, {
        method: "POST",
        body: JSON.stringify({ clientId }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send email");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Approval link sent to ${data.recipient}`);
      setOpen(false);
      setSelectedClientId("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSend = () => {
    if (!selectedClientId) {
      toast.error("Please select a client to send the email to");
      return;
    }
    sendEmailMutation.mutate(selectedClientId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Mail className="w-4 h-4 mr-2" />
          Send Confirmation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Batch Confirmation Email</DialogTitle>
          <DialogDescription>
            Send approval link to client: {clientName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="client-select">Select Client Recipient</Label>
            <select
              id="client-select"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full p-2 border rounded-md mt-1"
            >
              <option value="">-- Select a client --</option>
              {matchingClients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.companyName} ({client.email || 'No email'})
                </option>
              ))}
            </select>
            {matchingClients.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No matching clients found. Please create a client record for "{clientName}" first.
              </p>
            )}
          </div>
          <Button 
            onClick={handleSend} 
            disabled={sendEmailMutation.isPending || !selectedClientId}
            className="w-full"
          >
            {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
