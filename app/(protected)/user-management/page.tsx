
'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Shield, UserCog, Phone, Edit2, Trash2, Crown, Building2, Plus, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  phone?: string;
  role: string;
  clientId?: string;
  createdAt: string;
}

interface Client {
  id: string;
  companyName: string;
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  // States for Edit Dialogs
  const [editingPhone, setEditingPhone] = useState<{ userId: string; phone: string } | null>(null);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState<{ userId: string; firstName: string; lastName: string } | null>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  
  // States for Create Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "", // Required for creation
    role: "driver",
    clientId: "",
    phone: ""
  });
  
  // State for Password Dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState<{ userId: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<User> }) => {
      // Consolidates all patch requests to one endpoint
      return await apiRequest("PATCH", `/api/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast.success("User updated successfully");
      setPhoneDialogOpen(false);
      setNameDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update user");
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return await apiRequest("POST", "/api/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast.success("User created successfully");
      setCreateDialogOpen(false);
      setNewUser({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "driver",
        clientId: "",
        phone: ""
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create user");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast.success("User deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete user");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      return await apiRequest("PATCH", `/api/users/${userId}`, { password });
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
      setPasswordDialogOpen(false);
      setNewPassword("");
      setChangingPassword(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update password");
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUserMutation.mutate({ userId, data: { role: newRole } });
  };

  const handleClientChange = (userId: string, clientId: string | null) => {
    // Note: sending null inside JSON for nullable field
    updateUserMutation.mutate({ userId, data: { clientId: clientId || null } as any });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to permanently delete ${userName}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleChangePasswordClick = (userId: string, name: string) => {
    setChangingPassword({ userId, name });
    setNewPassword("");
    setPasswordDialogOpen(true);
  };

  const handlePasswordSave = () => {
    if (changingPassword && newPassword.length >= 8) {
      changePasswordMutation.mutate({
        userId: changingPassword.userId,
        password: newPassword
      });
    } else {
        toast.error("Password must be at least 8 characters");
    }
  };

  const handlePhoneEdit = (userId: string, currentPhone?: string) => {
    setEditingPhone({ userId, phone: currentPhone || "" });
    setPhoneDialogOpen(true);
  };

  const handlePhoneSave = () => {
    if (editingPhone) {
      updateUserMutation.mutate({
        userId: editingPhone.userId,
        data: { phone: editingPhone.phone },
      });
    }
  };

  const handleNameEdit = (userId: string, firstName: string, lastName: string) => {
    setEditingName({ userId, firstName: firstName || "", lastName: lastName || "" });
    setNameDialogOpen(true);
  };

  const handleNameSave = () => {
    if (editingName && editingName.firstName.trim() && editingName.lastName.trim()) {
      updateUserMutation.mutate({
        userId: editingName.userId,
        data: { 
            firstName: editingName.firstName.trim(),
            lastName: editingName.lastName.trim()
        },
      });
    }
  };

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.password || !newUser.firstName || !newUser.lastName) {
       toast.error("Please fill in all required fields");
       return;
    }
    createUserMutation.mutate(newUser);
  };

  const getAdminCount = () => {
    return users?.filter(u => u.role === 'admin').length || 0;
  };

  const isLastAdmin = (user: User) => {
    return user.role === 'admin' && getAdminCount() === 1;
  };

  const currentRole = currentUser?.user_metadata?.role || 'driver';

  const canModifyUser = (targetUser: User) => {
    // Super admins can modify anyone except themselves (to avoid locking out)
    if (currentRole === 'super_admin') {
      return targetUser.id !== currentUser?.id;
    }
    // Regular admins cannot modify super admins
    if (targetUser.role === 'super_admin') {
      return false;
    }
    // Regular admins can modify drivers and other admins (except themselves and last admin)
    return targetUser.id !== currentUser?.id && !isLastAdmin(targetUser);
  };

  const getInitials = (firstName: string, lastName: string) => {
    if (!firstName || !lastName) {
      return "??";
    }
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") {
      return (
        <Badge className="gap-1 bg-amber-500 hover:bg-amber-600">
          <Crown className="w-3 h-3" />
          Super Admin
        </Badge>
      );
    }
    if (role === "admin") {
      return (
        <Badge className="gap-1 bg-purple-500 hover:bg-purple-600">
          <Shield className="w-3 h-3" />
          Admin
        </Badge>
      );
    }
    if (role === "client") {
      return (
        <Badge className="gap-1 bg-blue-500 hover:bg-blue-600">
          <Building2 className="w-3 h-3" />
          Client
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <UserCog className="w-3 h-3" />
        Driver
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-user-management">
            <Users className="w-8 h-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles and permissions
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
             <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new user account with Supabase credentials</DialogDescription>
             </DialogHeader>
             <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>First Name *</Label>
                        <Input 
                            value={newUser.firstName} 
                            onChange={e => setNewUser({...newUser, firstName: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Last Name *</Label>
                        <Input 
                            value={newUser.lastName} 
                            onChange={e => setNewUser({...newUser, lastName: e.target.value})}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Email *</Label>
                    <div className="relative">
                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="email" 
                            className="pl-9"
                            value={newUser.email} 
                            onChange={e => setNewUser({...newUser, email: e.target.value})}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Password *</Label>
                    <div className="relative">
                        <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="password" 
                            className="pl-9"
                            placeholder="Min 8 characters"
                            value={newUser.password} 
                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Role *</Label>
                         <Select 
                            value={newUser.role} 
                            onValueChange={val => setNewUser({...newUser, role: val})}
                         >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="driver">Driver</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                             {currentRole === 'super_admin' && (
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                             )}
                          </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input 
                            value={newUser.phone} 
                            onChange={e => setNewUser({...newUser, phone: e.target.value})}
                        />
                    </div>
                </div>
                {newUser.role === 'client' && (
                    <div className="space-y-2">
                        <Label>Linked Company</Label>
                         <Select 
                            value={newUser.clientId} 
                            onValueChange={val => setNewUser({...newUser, clientId: val})}
                         >
                          <SelectTrigger>
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.companyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                )}
             </div>
             <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
             <Skeleton className="h-12 w-full" />
             <Skeleton className="h-12 w-full" />
             <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ) : users && users.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              {users.length} {users.length === 1 ? "user" : "users"} registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.profileImageUrl} />
                          <AvatarFallback>
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <p className="font-medium" data-testid={`text-name-${user.id}`}>
                            {user.firstName && user.lastName ? (
                              `${user.firstName} ${user.lastName}`
                            ) : (
                              <span className="text-muted-foreground italic">No name set</span>
                            )}
                          </p>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleNameEdit(user.id, user.firstName, user.lastName)}
                            data-testid={`button-edit-name-${user.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-email-${user.id}`}>
                      {user.email}
                    </TableCell>
                    <TableCell data-testid={`text-phone-${user.id}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {user.phone || <span className="text-muted-foreground">—</span>}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handlePhoneEdit(user.id, user.phone)}
                          data-testid={`button-edit-phone-${user.id}`}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`badge-role-${user.id}`}>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell data-testid={`cell-company-${user.id}`}>
                      {user.role === 'client' ? (
                        <Select
                          value={user.clientId || ""}
                          onValueChange={(value) => handleClientChange(user.id, value || null)}
                          disabled={updateUserMutation.isPending || !canModifyUser(user)}
                        >
                          <SelectTrigger className="w-40" data-testid={`select-company-${user.id}`}>
                            <SelectValue placeholder="Select company..." />
                          </SelectTrigger>
                          <SelectContent>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.companyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!canModifyUser(user) ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-block">
                                <Select
                                  value={user.role}
                                  disabled={true}
                                >
                                  <SelectTrigger 
                                    className="w-36"
                                    data-testid={`select-role-${user.id}`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                </Select>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {user.id === currentUser?.id 
                                  ? "You cannot change your own role"
                                  : user.role === 'super_admin' && currentRole !== 'super_admin'
                                  ? "Only super admins can modify super admin roles"
                                  : "Cannot modify this user."}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.id, value)}
                            disabled={updateUserMutation.isPending}
                          >
                            <SelectTrigger 
                              className="w-36"
                              data-testid={`select-role-${user.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="driver">Driver</SelectItem>
                              <SelectItem value="client">Client</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              {currentRole === 'super_admin' && (
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {/* Change Password Button */}
                        {canModifyUser(user) && (
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleChangePasswordClick(user.id, `${user.firstName} ${user.lastName}`)}
                                disabled={changePasswordMutation.isPending}
                                className="text-muted-foreground hover:text-primary"
                                >
                                <Lock className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Change Password</p>
                            </TooltipContent>
                            </Tooltip>
                        )}

                        {/* Delete button - only for super admins/admins deleting regular users */}
                        {canModifyUser(user) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                            disabled={deleteUserMutation.isPending}
                            data-testid={`button-delete-user-${user.id}`}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TooltipProvider>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">No users found</p>
          </CardContent>
        </Card>
      )}



      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {changingPassword?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                    type="password"
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-9"
                    />
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordSave}
              disabled={changePasswordMutation.isPending || newPassword.length < 8}
            >
              {changePasswordMutation.isPending ? "Saving..." : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent data-testid="dialog-edit-phone">
          <DialogHeader>
            <DialogTitle>Edit Phone Number</DialogTitle>
            <DialogDescription>
              Update the user's phone number for SMS reminders
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="tel"
              placeholder="+44 7700 900123"
              value={editingPhone?.phone || ""}
              onChange={(e) =>
                setEditingPhone(
                  editingPhone
                    ? { ...editingPhone, phone: e.target.value }
                    : null
                )
              }
              data-testid="input-phone-edit"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPhoneDialogOpen(false)}
              data-testid="button-cancel-phone"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePhoneSave}
              disabled={updateUserMutation.isPending}
              data-testid="button-save-phone"
            >
              {updateUserMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent data-testid="dialog-edit-name">
          <DialogHeader>
            <DialogTitle>Edit User Name</DialogTitle>
            <DialogDescription>
              Update the user's display name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">First Name</label>
              <Input
                type="text"
                placeholder="First Name"
                value={editingName?.firstName || ""}
                onChange={(e) =>
                  setEditingName(
                    editingName
                      ? { ...editingName, firstName: e.target.value }
                      : null
                  )
                }
                data-testid="input-first-name-edit"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Last Name</label>
              <Input
                type="text"
                placeholder="Last Name"
                value={editingName?.lastName || ""}
                onChange={(e) =>
                  setEditingName(
                    editingName
                      ? { ...editingName, lastName: e.target.value }
                      : null
                  )
                }
                data-testid="input-last-name-edit"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNameDialogOpen(false)}
              data-testid="button-cancel-name"
            >
              Cancel
            </Button>
            <Button
              onClick={handleNameSave}
              disabled={updateUserMutation.isPending || !editingName?.firstName?.trim() || !editingName?.lastName?.trim()}
              data-testid="button-save-name"
            >
              {updateUserMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
