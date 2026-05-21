
'use client';

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDriverClassSchema, type InsertDriverClass } from "@/shared/schema";
import { Layers, Plus, Pencil, Trash2, ShieldAlert, ChevronDown, ChevronRight, PoundSterling, Save, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

// Types
interface DriverClass {
  id: string;
  name: string;
}

interface Client {
  id: string;
  companyName: string;
}

interface ClassRate {
  id: string;
  driverClassId: string;
  clientId: string;
  hourlyRate: number;
  saturdayRate: number;
  sundayRate: number;
  holidayRate: number;
  clientName: string;
}

export default function DriverClasses() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<DriverClass | null>(null);
  const [deletingClass, setDeletingClass] = useState<DriverClass | null>(null);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  const { data: driverClasses = [], isLoading } = useQuery<DriverClass[]>({
    queryKey: ["/api/driver-classes"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const form = useForm<InsertDriverClass>({
    resolver: zodResolver(insertDriverClassSchema),
    defaultValues: {
      name: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertDriverClass) => {
      return await apiRequest("POST", "/api/driver-classes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver-classes"] });
      toast.success("Driver class created successfully");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create driver class");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertDriverClass> }) => {
      return await apiRequest("PATCH", `/api/driver-classes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver-classes"] });
      toast.success("Driver class updated successfully");
      setIsDialogOpen(false);
      setEditingClass(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update driver class");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/driver-classes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver-classes"] });
      toast.success("Driver class deleted successfully");
      setDeletingClass(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete driver class");
    },
  });

  const handleOpenDialog = (dc?: DriverClass) => {
    if (dc) {
      setEditingClass(dc);
      form.reset({ name: dc.name });
    } else {
      setEditingClass(null);
      form.reset({ name: "" });
    }
    setIsDialogOpen(true);
  };

  const toggleClassExpanded = (classId: string) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  // If role is undefined/loading, show loading
  if (!user) {
    return <div className="p-8 text-center">Loading access rights...</div>;
  }

  if (role !== "admin" && role !== "super_admin") {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">Admin Access Required</h2>
              <p className="text-muted-foreground">
                You need administrator privileges to manage driver classes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-driver-classes">
            Driver Classes
          </h1>
          <p className="text-muted-foreground">
            Manage driver job roles and per-client hourly rates
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          data-testid="button-add-class"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Class
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 space-y-4">
            <div className="h-12 bg-muted rounded w-full"></div>
            <div className="h-12 bg-muted rounded w-full"></div>
            <div className="h-12 bg-muted rounded w-full"></div>
          </CardContent>
        </Card>
      ) : driverClasses.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Layers className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-40" />
              <h2 className="text-xl font-semibold mb-2">No Driver Classes Yet</h2>
              <p className="text-muted-foreground mb-4">
                Add your first driver class to start managing hourly rates per client
              </p>
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-first-class">
                <Plus className="w-4 h-4 mr-2" />
                Add Class
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-0 pb-6">
            <CardTitle>Driver Classes</CardTitle>
            <CardDescription>
              {driverClasses.length} {driverClasses.length === 1 ? "class" : "classes"} in your system.
              Click on a class to manage per-client hourly rates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {driverClasses.map((dc) => (
                <ClassRow
                  key={dc.id}
                  driverClass={dc}
                  clients={clients}
                  isExpanded={expandedClasses.has(dc.id)}
                  onToggle={() => toggleClassExpanded(dc.id)}
                  onEdit={() => handleOpenDialog(dc)}
                  onDelete={() => setDeletingClass(dc)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Class Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? "Edit Driver Class" : "Add New Driver Class"}</DialogTitle>
            <DialogDescription>Set the name for this driver job role / class.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => {
              if (editingClass) updateMutation.mutate({ id: editingClass.id, data });
              else createMutation.mutate(data);
            })} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Class 1, HGV, Van Driver" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingClass ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingClass} onOpenChange={() => setDeletingClass(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Driver Class?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete &quot;{deletingClass?.name}&quot;? This will remove all associated client rates.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingClass && deleteMutation.mutate(deletingClass.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClassRow({
  driverClass,
  clients,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  driverClass: DriverClass;
  clients: Client[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  
  // Local state for rate inputs
  const [localRates, setLocalRates] = useState<Record<string, { weekday: string; saturday: string; sunday: string; holiday: string; }>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: queryRates, isLoading } = useQuery<ClassRate[]>({
    queryKey: ["/api/driver-classes", driverClass.id, "rates"],
    queryFn: async () => {
      const res = await fetch(`/api/driver-classes/${driverClass.id}/rates`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch rates");
      return res.json();
    },
    enabled: isExpanded,
  });

  const rates = queryRates || [];

  // Populate local rates when data loads
  useEffect(() => {
    if (!queryRates) return;
    const rateMap: Record<string, { weekday: string; saturday: string; sunday: string; holiday: string; }> = {};
    queryRates.forEach(r => {
      rateMap[r.clientId] = {
        weekday: String(r.hourlyRate || ""),
        saturday: String(r.saturdayRate || ""),
        sunday: String(r.sundayRate || ""),
        holiday: String(r.holidayRate || ""),
      };
    });
    setLocalRates(rateMap);
    setHasChanges(false);
  }, [queryRates]);

  const saveRatesMutation = useMutation({
    mutationFn: async (ratesPayload: { clientId: string; hourlyRate: number; saturdayRate: number; sundayRate: number; holidayRate: number; }[]) => {
      const res = await fetch(`/api/driver-classes/${driverClass.id}/rates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: ratesPayload }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Failed to save rates");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver-classes", driverClass.id, "rates"] });
      toast.success("Rates saved successfully");
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save rates");
    },
  });

  const handleRateChange = (clientId: string, field: 'weekday'|'saturday'|'sunday'|'holiday', value: string) => {
    setLocalRates(prev => ({ 
      ...prev, 
      [clientId]: {
        ...(prev[clientId] || { weekday: "", saturday: "", sunday: "", holiday: "" }),
        [field]: value
      } 
    }));
    setHasChanges(true);
  };

  const handleSaveRates = () => {
    const ratesPayload = clients
      .map(client => ({
        clientId: client.id,
        hourlyRate: parseFloat(localRates[client.id]?.weekday || "0") || 0,
        saturdayRate: parseFloat(localRates[client.id]?.saturday || "0") || 0,
        sundayRate: parseFloat(localRates[client.id]?.sunday || "0") || 0,
        holidayRate: parseFloat(localRates[client.id]?.holiday || "0") || 0,
      }))
      .filter(r => r.hourlyRate > 0 || r.saturdayRate > 0 || r.sundayRate > 0 || r.holidayRate > 0 || rates.some(existing => existing.clientId === r.clientId));

    saveRatesMutation.mutate(ratesPayload);
  };

  // Count how many clients have rates set
  const rateCount = rates.filter(r => r.hourlyRate > 0 || r.saturdayRate > 0 || r.sundayRate > 0 || r.holidayRate > 0).length;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 rounded-t-lg">
            <div className="flex items-center gap-4 flex-1">
              {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <div>
                <h3 className="font-semibold text-lg">{driverClass.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <PoundSterling className="w-3 h-3" />
                    {rateCount > 0 ? `${rateCount} client rate${rateCount !== 1 ? 's' : ''} set` : 'No rates set'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Button size="icon" variant="ghost" onClick={onEdit}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={onDelete} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0 border-t bg-muted/20">
            <div className="flex justify-between items-center mb-3 mt-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Client Hourly Rates</h4>
              <Button
                size="sm"
                onClick={handleSaveRates}
                disabled={!hasChanges || saveRatesMutation.isPending}
              >
                <Save className="w-3 h-3 mr-1" />
                {saveRatesMutation.isPending ? "Saving..." : "Save Rates"}
              </Button>
            </div>
            {isLoading ? (
              <div className="text-sm text-center py-2">Loading rates...</div>
            ) : clients.length === 0 ? (
              <div className="text-sm text-center py-2 text-muted-foreground">No clients in the system yet</div>
            ) : (
              <div className="grid gap-2">
                {clients.map(client => (
                  <div key={client.id} className="flex flex-col sm:flex-row sm:items-start justify-between p-4 bg-background border rounded-md gap-4">
                    <div className="flex items-center gap-3 flex-1 mt-1">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="font-medium text-sm">{client.companyName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Weekday</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">£</span>
                          <Input
                            type="number" step="0.01" min="0" className="w-20 h-8 text-sm px-2"
                            placeholder="0.00"
                            value={localRates[client.id]?.weekday ?? ""}
                            onChange={(e) => handleRateChange(client.id, 'weekday', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Saturday</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">£</span>
                          <Input
                            type="number" step="0.01" min="0" className="w-20 h-8 text-sm px-2"
                            placeholder="0.00"
                            value={localRates[client.id]?.saturday ?? ""}
                            onChange={(e) => handleRateChange(client.id, 'saturday', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Sunday</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">£</span>
                          <Input
                            type="number" step="0.01" min="0" className="w-20 h-8 text-sm px-2"
                            placeholder="0.00"
                            value={localRates[client.id]?.sunday ?? ""}
                            onChange={(e) => handleRateChange(client.id, 'sunday', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Holiday</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">£</span>
                          <Input
                            type="number" step="0.01" min="0" className="w-20 h-8 text-sm px-2"
                            placeholder="0.00"
                            value={localRates[client.id]?.holiday ?? ""}
                            onChange={(e) => handleRateChange(client.id, 'holiday', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
