
'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, insertClientContactSchema, type InsertClient, type InsertClientContact } from "@/shared/schema";
import { Building2, Plus, Pencil, Trash2, Mail, Phone, ShieldAlert, ChevronDown, ChevronRight, Star } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

// Types
interface Client {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  notes?: string;
  minimumBillableHours: number;
}

interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  email: string;
  phone?: string;
  isPrimary: number;
}

export default function ClientManagement() {
  const { user, actualRole } = useAuth(); // Assuming updated useAuth hook supports actualRole or we use role
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  
  // Contact Dialog State
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [deletingContact, setDeletingContact] = useState<ClientContact | null>(null);

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      notes: "",
      minimumBillableHours: 8,
    },
  });

  const contactForm = useForm<InsertClientContact>({
    resolver: zodResolver(insertClientContactSchema.omit({ clientId: true })),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      isPrimary: 0,
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      // Clean up optional fields
      return await apiRequest("POST", "/api/clients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast.success("Client created successfully");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create client");
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertClient> }) => {
      return await apiRequest("PATCH", `/api/clients/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast.success("Client updated successfully");
      setIsDialogOpen(false);
      setEditingClient(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update client");
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast.success("Client deleted successfully");
      setDeletingClient(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete client");
    },
  });

  // Contact Mutations
  const createContactMutation = useMutation({
    mutationFn: async ({ clientId, data }: { clientId: string; data: Record<string, any> }) => {
      return await apiRequest("POST", `/api/clients/${clientId}/contacts`, data);
    },
    onSuccess: () => {
      if (activeClientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/clients", activeClientId, "contacts"] });
      }
      toast.success("Contact added successfully");
      setIsContactDialogOpen(false);
      contactForm.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add contact");
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertClientContact> }) => {
      return await apiRequest("PATCH", `/api/client-contacts/${id}`, data);
    },
    onSuccess: () => {
      if (activeClientId) {
         queryClient.invalidateQueries({ queryKey: ["/api/clients", activeClientId, "contacts"] });
      }
      toast.success("Contact updated successfully");
      setIsContactDialogOpen(false);
      setEditingContact(null);
      contactForm.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update contact");
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/client-contacts/${id}`);
    },
    onSuccess: () => {
      if (activeClientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/clients", activeClientId, "contacts"] });
      }
      toast.success("Contact deleted successfully");
      setDeletingContact(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete contact");
    },
  });

   const setPrimaryContactMutation = useMutation({
    mutationFn: async ({ contactId, clientId }: { contactId: string; clientId: string }) => {
      return await apiRequest("POST", `/api/client-contacts/${contactId}/set-primary`, { clientId });
    },
    onSuccess: () => {
      if (activeClientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/clients", activeClientId, "contacts"] });
      }
      toast.success("Primary contact updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to set primary contact");
    },
  });

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      form.reset({
        companyName: client.companyName,
        contactName: client.contactName,
        email: client.email,
        phone: client.phone || "",
        notes: client.notes || "",
        minimumBillableHours: client.minimumBillableHours ?? 8,
      });
    } else {
      setEditingClient(null);
      form.reset({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        notes: "",
        minimumBillableHours: 8,
      });
    }
    setIsDialogOpen(true);
  };

  const handleOpenContactDialog = (clientId: string, contact?: ClientContact) => {
    setActiveClientId(clientId);
    if (contact) {
      setEditingContact(contact);
      contactForm.reset({
        name: contact.name,
        email: contact.email,
        phone: contact.phone || "",
        isPrimary: contact.isPrimary,
      });
    } else {
      setEditingContact(null);
      contactForm.reset({
        name: "",
        email: "",
        phone: "",
        isPrimary: 0,
      });
    }
    setIsContactDialogOpen(true);
  };

  const toggleClientExpanded = (clientId: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
        setActiveClientId(clientId);
      }
      return next;
    });
  };

  // If role is undefined/loading, maybe show loading skeleton
  if (!user) {
      return <div className="p-8 text-center">Loading access rights...</div>;
  }
  
  // Basic access check (assuming metadata role is available on user object)
  const role = user.user_metadata?.role;
  if (role !== "admin" && role !== "super_admin") {
      return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">Admin Access Required</h2>
              <p className="text-muted-foreground">
                You need administrator privileges to manage clients.
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
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-client-management">
            Client Management
          </h1>
          <p className="text-muted-foreground">
            Manage client contacts for approval link distribution
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          data-testid="button-add-client"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Client
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
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-40" />
              <h2 className="text-xl font-semibold mb-2">No Clients Yet</h2>
              <p className="text-muted-foreground mb-4">
                Add your first client to start sending approval links
              </p>
              <Button onClick={() => handleOpenDialog()} data-testid="button-add-first-client">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-0 pb-6">
            <CardTitle>Client Contacts</CardTitle>
            <CardDescription>
              {clients.length} {clients.length === 1 ? "client" : "clients"} in your system. 
              Click on a client row to manage their contact persons.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clients.map((client) => (
                <ClientRow 
                  key={client.id}
                  client={client}
                  isExpanded={expandedClients.has(client.id)}
                  onToggle={() => toggleClientExpanded(client.id)}
                  onEdit={() => handleOpenDialog(client)}
                  onDelete={() => setDeletingClient(client)}
                  onAddContact={() => handleOpenContactDialog(client.id)}
                  onEditContact={(contact) => handleOpenContactDialog(client.id, contact)}
                  onDeleteContact={(contact) => {
                    setActiveClientId(client.id);
                    setDeletingContact(contact);
                  }}
                  onSetPrimary={(contactId) => {
                      setActiveClientId(client.id);
                      setPrimaryContactMutation.mutate({ contactId, clientId: client.id })
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Client Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
                <DialogDescription>Manage client details and default settings.</DialogDescription>
            </DialogHeader>
             <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => {
                if(editingClient) updateClientMutation.mutate({ id: editingClient.id, data });
                else createClientMutation.mutate(data);
            })} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Contact Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input {...field} type="email" /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input {...field} value={field.value||''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
               </div>
               <FormField
                control={form.control}
                name="minimumBillableHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Billable Hours</FormLabel>
                    <FormControl>
                        <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value))} 
                        />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Default hours to charge if shift is shorter.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea {...field} value={field.value||''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createClientMutation.isPending || updateClientMutation.isPending}>
                      {editingClient ? "Update" : "Create"}
                  </Button>
              </DialogFooter>
            </form>
          </Form>
          </DialogContent>
      </Dialog>
      
      {/* Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
            <DialogHeader>
                 <DialogTitle>{editingContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
                 <DialogDescription>Add secondary contacts for this client.</DialogDescription>
            </DialogHeader>
             <Form {...contactForm}>
                <form onSubmit={contactForm.handleSubmit((data) => {
                     if (!activeClientId) return;
                     if(editingContact) updateContactMutation.mutate({ id: editingContact.id, data });
                     else createContactMutation.mutate({ clientId: activeClientId, data });
                })} className="space-y-4">
                    <FormField
                        control={contactForm.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={contactForm.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl><Input {...field} type="email" /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={contactForm.control}
                            name="phone"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl><Input {...field} value={field.value||''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                     <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setIsContactDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createContactMutation.isPending || updateContactMutation.isPending}>Save Contact</Button>
                    </DialogFooter>
                </form>
             </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingClient} onOpenChange={() => setDeletingClient(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Client?</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to delete {deletingClient?.companyName}? This will just hide it (soft delete).</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deletingClient && deleteClientMutation.mutate(deletingClient.id)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       {/* Delete Contact Confirmation */}
       <AlertDialog open={!!deletingContact} onOpenChange={() => setDeletingContact(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to delete {deletingContact?.name}? This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deletingContact && deleteContactMutation.mutate(deletingContact.id)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClientRow({ 
  client, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onDelete,
  onAddContact,
  onEditContact,
  onDeleteContact,
  onSetPrimary,
}: { 
  client: Client;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddContact: () => void;
  onEditContact: (contact: ClientContact) => void;
  onDeleteContact: (contact: ClientContact) => void;
  onSetPrimary: (contactId: string) => void;
}) {
    const { data: contacts = [], isLoading } = useQuery<ClientContact[]>({
    queryKey: ["/api/clients", client.id, "contacts"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${client.id}/contacts`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
    enabled: isExpanded,
  });

   return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 rounded-t-lg">
             <div className="flex items-center gap-4 flex-1">
                 {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground"/> : <ChevronRight className="w-4 h-4 text-muted-foreground"/>}
                 <div>
                     <h3 className="font-semibold text-lg">{client.companyName}</h3>
                     <div className="flex items-center gap-4 text-sm text-muted-foreground">
                         <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {client.email}</span>
                         <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {client.phone || "N/A"}</span>
                     </div>
                 </div>
             </div>
             <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                 <Button size="icon" variant="ghost" onClick={onEdit}><Pencil className="w-4 h-4"/></Button>
                 <Button size="icon" variant="ghost" onClick={onDelete} className="text-destructive"><Trash2 className="w-4 h-4"/></Button>
             </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
             <div className="p-4 pt-0 border-t bg-muted/20">
                 <div className="flex justify-between items-center mb-3 mt-3">
                     <h4 className="text-sm font-semibold text-muted-foreground">Contacts</h4>
                     <Button size="sm" variant="outline" onClick={onAddContact}><Plus className="w-3 h-3 mr-1"/> Add Contact</Button>
                 </div>
                 {isLoading ? <div className="text-sm text-center py-2">Loading contacts...</div> : contacts.length === 0 ? (
                     <div className="text-sm text-center py-2 text-muted-foreground">No additional contacts</div>
                 ) : (
                     <div className="grid gap-2">
                         {contacts.map(contact => (
                             <div key={contact.id} className="flex items-center justify-between p-3 bg-background border rounded-md">
                                 <div className="flex items-center gap-3">
                                     {contact.isPrimary === 1 && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Star className="w-3 h-3 mr-1"/> Primary</Badge>}
                                     <div>
                                         <p className="font-medium text-sm">{contact.name}</p>
                                         <p className="text-xs text-muted-foreground">{contact.email} {contact.phone && `• ${contact.phone}`}</p>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-1">
                                     {contact.isPrimary !== 1 && (
                                         <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => onSetPrimary(contact.id)}>Set Primary</Button>
                                     )}
                                     <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEditContact(contact)}><Pencil className="w-3 h-3"/></Button>
                                     <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDeleteContact(contact)}><Trash2 className="w-3 h-3"/></Button>
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
