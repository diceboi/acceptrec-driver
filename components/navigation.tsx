'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutDashboard, FileText, LogOut, CheckSquare, DollarSign, Building2, Star, MessageSquare, CalendarDays, MessageCircle, Shield, Trash2, Users, ChevronDown, Eye, EyeOff, Search } from 'lucide-react';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';

import { useAuth } from '@/hooks/use-auth';

interface Client {
  id: string;
  companyName: string;
  contactName?: string;
}

export default function Navigation() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { user, effectiveRole, actualRole, isImpersonating, impersonate, impersonateClient, stopImpersonating } = useAuth();
    const [clientPickerOpen, setClientPickerOpen] = useState(false);
    const [clientSearchQuery, setClientSearchQuery] = useState("");

    // Fetch clients for the picker (only when super admin)
    const { data: clients } = useQuery<Client[]>({
        queryKey: ["/api/clients"],
        enabled: actualRole === 'super_admin',
    });

    const filteredClients = clients?.filter(client =>
        client.companyName.toLowerCase().includes(clientSearchQuery.toLowerCase())
    ) || [];

    const handleSelectClient = (clientId: string) => {
        impersonateClient(clientId);
        setClientPickerOpen(false);
        setClientSearchQuery("");
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const isSuperAdmin = actualRole === 'super_admin';
    const isAdmin = effectiveRole === 'admin' || effectiveRole === 'super_admin';
    const isClient = effectiveRole === 'client';

    const getInitials = () => {
        if (user?.user_metadata?.full_name) {
            const names = user.user_metadata.full_name.split(' ');
            return names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        }
        if (user?.email) {
            return user.email.slice(0, 2).toUpperCase();
        }
        return 'U';
    };

    const getDisplayName = () => {
        if (user?.user_metadata?.full_name) {
            return user.user_metadata.full_name;
        }
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return 'User';
    };

    return (
        <>
        <header className="border-b bg-card">
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Image
                                src="/Accept Stacked Logo with Strapline_CMYK300_1761553395131.jpg"
                                alt="Accept Timesheet Processing"
                                width={120}
                                height={60}
                                className="h-10 w-auto"
                            />
                        </Link>
                        <nav className="hidden sm:flex items-center gap-1">
                            {isClient ? (
                                <>
                                    <Link href="/dashboard">
                                        <Button
                                            variant={pathname === '/dashboard' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="gap-1.5 px-2"
                                        >
                                            <LayoutDashboard className="w-4 h-4" />
                                            <span className="hidden md:inline">Dashboard</span>
                                        </Button>
                                    </Link>
                                    <Link href="/client-portal">
                                        <Button
                                            variant={pathname === '/client-portal' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="gap-1.5 px-2"
                                        >
                                            <CheckSquare className="w-4 h-4" />
                                            <span className="hidden md:inline">Approve Timesheets</span>
                                        </Button>
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link href="/dashboard">
                                        <Button
                                            variant={pathname === '/dashboard' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="gap-1.5 px-2"
                                        >
                                            <LayoutDashboard className="w-4 h-4" />
                                            <span className="hidden md:inline">Dashboard</span>
                                        </Button>
                                    </Link>
                                    <Link href="/timesheets">
                                        <Button
                                            variant={pathname === '/timesheets' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="gap-1.5 px-2"
                                        >
                                            <FileText className="w-4 h-4" />
                                            <span className="hidden md:inline">Timesheets</span>
                                        </Button>
                                    </Link>
                                    {isAdmin && (
                                        <>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="gap-1.5 px-2"
                                                    >
                                                        <CheckSquare className="w-4 h-4" />
                                                        <span className="hidden md:inline">Admin</span>
                                                        <ChevronDown className="w-3 h-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <Link href="/client-approvals">
                                                        <DropdownMenuItem className="gap-2 cursor-pointer">
                                                            <CheckSquare className="w-4 h-4" />
                                                            Client Approvals
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <Link href="/payroll">
                                                        <DropdownMenuItem className="gap-2 cursor-pointer">
                                                            <DollarSign className="w-4 h-4" />
                                                            Payroll
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <DropdownMenuSeparator />
                                                    <Link href="/driver-performance">
                                                        <DropdownMenuItem className="gap-2 cursor-pointer">
                                                            <Star className="w-4 h-4" />
                                                            Driver Performance
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <Link href="/client-feedback">
                                                        <DropdownMenuItem className="gap-2 cursor-pointer">
                                                            <MessageSquare className="w-4 h-4" />
                                                            Client Feedback
                                                        </DropdownMenuItem>
                                                    </Link>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="gap-1.5 px-2"
                                                    >
                                                        <Building2 className="w-4 h-4" />
                                                        <span className="hidden md:inline">Manage</span>
                                                        <ChevronDown className="w-3 h-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <Link href="/client-management">
                                                        <DropdownMenuItem className="gap-2 cursor-pointer">
                                                            <Building2 className="w-4 h-4" />
                                                            Clients
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <Link href="/roster-management">
                                                        <DropdownMenuItem className="gap-2 cursor-pointer">
                                                            <CalendarDays className="w-4 h-4" />
                                                            Rosters
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <Link href="/user-management">
                                                        <DropdownMenuItem className="gap-2 cursor-pointer">
                                                            <Users className="w-4 h-4" />
                                                            Users
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <DropdownMenuSeparator />
                                                    <Link href="/sms-messaging">
                                                        <DropdownMenuItem className="gap-2 cursor-pointer">
                                                            <MessageCircle className="w-4 h-4" />
                                                            SMS Messaging
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <Link href="/audit-log">
                                                        <DropdownMenuItem className="gap-2 cursor-pointer">
                                                            <Shield className="w-4 h-4" />
                                                            Audit Log
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    {actualRole === 'super_admin' && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <Link href="/deleted-items">
                                                                <DropdownMenuItem className="gap-2 cursor-pointer">
                                                                    <Trash2 className="w-4 h-4" />
                                                                    Deleted Items
                                                                </DropdownMenuItem>
                                                            </Link>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </>
                                    )}
                                </>
                            )}
                        </nav>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-2">
                                <Avatar className="w-8 h-8">
                                    {user?.user_metadata?.avatar_url && (
                                        <AvatarImage src={user.user_metadata.avatar_url} alt={getDisplayName()} />
                                    )}
                                    <AvatarFallback>{getInitials()}</AvatarFallback>
                                </Avatar>
                                <span className="hidden sm:inline">{getDisplayName()}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>
                                <div className="flex flex-col">
                                    <span>{getDisplayName()}</span>
                                    <span className="text-xs text-muted-foreground capitalize">
                                        {isImpersonating ? (
                                            <span className="text-amber-600">Viewing as {effectiveRole}</span>
                                        ) : (
                                            actualRole?.replace('_', ' ')
                                        )}
                                    </span>
                                </div>
                            </DropdownMenuLabel>
                            
                            {isSuperAdmin && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                        View As Role
                                    </DropdownMenuLabel>
                                    {isImpersonating ? (
                                        <DropdownMenuItem
                                            onClick={() => stopImpersonating()}
                                            className="gap-2 cursor-pointer"
                                            data-testid="button-stop-impersonate"
                                        >
                                            <EyeOff className="w-4 h-4" />
                                            Exit {effectiveRole} View
                                        </DropdownMenuItem>
                                    ) : (
                                        <>
                                            <DropdownMenuItem
                                                onClick={() => impersonate('admin')}
                                                className="gap-2 cursor-pointer"
                                                data-testid="button-impersonate-admin"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View as Admin
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => impersonate('driver')}
                                                className="gap-2 cursor-pointer"
                                                data-testid="button-impersonate-driver"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View as Driver
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => setClientPickerOpen(true)}
                                                className="gap-2 cursor-pointer"
                                                data-testid="button-impersonate-client"
                                            >
                                                <Building2 className="w-4 h-4" />
                                                View as Client...
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
        
        {/* Client Picker Dialog for Super Admin Impersonation */}
        <Dialog open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Select a Client to View As</DialogTitle>
                    <DialogDescription>
                        Choose a client company to impersonate. You'll see the app as that client would see it.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search clients..."
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            className="pl-9"
                            data-testid="input-client-search"
                        />
                    </div>
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-1">
                            {filteredClients.length > 0 ? (
                                filteredClients.map((client) => (
                                    <Button
                                        key={client.id}
                                        variant="ghost"
                                        className="w-full justify-start gap-2 h-auto py-3"
                                        onClick={() => handleSelectClient(client.id)}
                                        data-testid={`button-select-client-${client.id}`}
                                    >
                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                        <div className="text-left">
                                            <div className="font-medium">{client.companyName}</div>
                                            {client.contactName && (
                                                <div className="text-xs text-muted-foreground">{client.contactName}</div>
                                            )}
                                        </div>
                                    </Button>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    {clientSearchQuery ? "No clients match your search" : "No clients available"}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    </>
    );
}
