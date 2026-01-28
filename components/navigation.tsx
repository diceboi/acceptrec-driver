'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import { LayoutDashboard, FileText, LogOut, CheckSquare, DollarSign, Building2, Star, MessageSquare, CalendarDays, MessageCircle, Shield, Trash2, Users, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';

import { useAuth } from '@/hooks/use-auth';

export default function Navigation() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { user, role } = useAuth();
    // Removed local userRole state as it is now provided by useAuth

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const isAdmin = role === 'admin' || role === 'super_admin';
    const isClient = role === 'client';

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
                                                    {role === 'super_admin' && (
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
                                        {role?.replace('_', ' ')}
                                    </span>
                                </div>
                            </DropdownMenuLabel>
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
    );
}
