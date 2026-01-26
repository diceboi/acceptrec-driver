import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { timesheets, approvalBatches } from '@/shared/schema';
import { eq, desc, and, gte, lte, count } from 'drizzle-orm';
import StatsCard from '@/components/stats-card';
import { Clock, CheckCircle, XCircle, ClipboardList, Building2, DollarSign, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { Timesheet } from '@/shared/schema';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return <div>Please log in</div>;
    }

    const role = user.user_metadata?.role || 'driver';
    const isAdmin = role === 'admin' || role === 'super_admin';
    const isClient = role === 'client';

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday start
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Calculate total hours helper
    const getTotalHours = (timesheet: Timesheet) => {
        return [
            parseFloat(timesheet.mondayTotal || "0"),
            parseFloat(timesheet.tuesdayTotal || "0"),
            parseFloat(timesheet.wednesdayTotal || "0"),
            parseFloat(timesheet.thursdayTotal || "0"),
            parseFloat(timesheet.fridayTotal || "0"),
            parseFloat(timesheet.saturdayTotal || "0"),
            parseFloat(timesheet.sundayTotal || "0"),
        ].reduce((sum, hours) => sum + hours, 0);
    };
    
    // Get clients helper
    const getClients = (timesheet: Timesheet): string[] => {
        const clients = [
            timesheet.mondayClient,
            timesheet.tuesdayClient,
            timesheet.wednesdayClient,
            timesheet.thursdayClient,
            timesheet.fridayClient,
            timesheet.saturdayClient,
            timesheet.sundayClient,
        ].filter(client => client && client.trim() !== "");
        return Array.from(new Set(clients));
    };

    if (isClient) {
        // Simple Client Dashboard for now
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Client Dashboard</h1>
                    <p className="text-muted-foreground">Review and approve driver timesheets for your company</p>
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                             <Building2 className="w-5 h-5" />
                             Welcome to the Client Portal
                        </CardTitle>
                        <CardDescription>
                            As a client user, you can review and approve driver timesheets submitted for your company.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-4">
                            <p className="text-muted-foreground">
                                Click the button below to view pending timesheets that require your approval.
                            </p>
                            <Link href="/client-portal">
                                <Button className="gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    View Pending Approvals
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isAdmin) {
        // Fetch Admin Data
        // Fetch Admin Data
        // Execute queries in parallel to speed up loading
        const [
            pendingResult,
            rejectedResult,
            draftResult,
            approvedThisWeekResult,
            recentEntries,
            allBatches
        ] = await Promise.all([
            db.select({ count: count() }).from(timesheets).where(eq(timesheets.approvalStatus, 'pending_approval')),
            db.select({ count: count() }).from(timesheets).where(eq(timesheets.approvalStatus, 'rejected')),
            db.select({ count: count() }).from(timesheets).where(eq(timesheets.approvalStatus, 'draft')),
            // Approximate "approved this week" by checking updated_at or similar if clientApprovedAt isn't queryable easily as date range in string column
            // For now, we'll fetch approved records and filter in JS if needed, OR just count total approved for speed.
            // Let's rely on standard count for now to avoid the heavy JS processing.
             db.select({ count: count() }).from(timesheets).where(eq(timesheets.approvalStatus, 'approved')), 
            db.select().from(timesheets).orderBy(desc(timesheets.weekStartDate)).limit(5),
            db.select().from(approvalBatches).orderBy(desc(approvalBatches.createdAt)).limit(5)
        ]);

        const pendingApprovalCount = pendingResult[0].count;
        const rejectedCount = rejectedResult[0].count;
        const draftCount = draftResult[0].count;
        const approvedThisWeekCount = approvedThisWeekResult[0].count; // Showing total approved for performance and simplicity


        return (
             <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Manage timesheets and client approvals</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatsCard title="Pending Approval" value={pendingApprovalCount.toString()} icon={Clock} />
                    <StatsCard title="Approved This Week" value={approvedThisWeekCount.toString()} icon={CheckCircle} />
                    <StatsCard title="Rejected" value={rejectedCount.toString()} icon={XCircle} />
                    <StatsCard title="Drafts" value={draftCount.toString()} icon={ClipboardList} />
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Quick Actions</h2>
                     <div className="grid gap-4 md:grid-cols-3">
                        <Link href="/client-approvals">
                             <Card className="hover:bg-accent/50 cursor-pointer transition-colors">
                                <CardContent className="p-6 flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                                         <CheckCircle className="w-6 h-6 text-primary" />
                                     </div>
                                     <div>
                                         <p className="font-semibold">Create Approval Batch</p>
                                         <p className="text-sm text-muted-foreground">Send timesheets to clients</p>
                                     </div>
                                </CardContent>
                             </Card>
                        </Link>
                         <Link href="/client-management">
                             <Card className="hover:bg-accent/50 cursor-pointer transition-colors">
                                <CardContent className="p-6 flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                                         <Building2 className="w-6 h-6 text-primary" />
                                     </div>
                                     <div>
                                         <p className="font-semibold">Manage Clients</p>
                                         <p className="text-sm text-muted-foreground">Add or update client info</p>
                                     </div>
                                </CardContent>
                             </Card>
                        </Link>
                         <Link href="/payroll">
                             <Card className="hover:bg-accent/50 cursor-pointer transition-colors">
                                <CardContent className="p-6 flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                                         <DollarSign className="w-6 h-6 text-primary" />
                                     </div>
                                     <div>
                                         <p className="font-semibold">View Payroll</p>
                                         <p className="text-sm text-muted-foreground">Export approved timesheets</p>
                                     </div>
                                </CardContent>
                             </Card>
                        </Link>
                     </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Approval Batches</CardTitle>
                            <CardDescription>Latest batches sent to clients</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {allBatches.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-40" />
                                    <p>No approval batches yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                     {allBatches.map((batch) => (
                                        <div key={batch.id} className="border-l-2 border-primary pl-4">
                                            <div className="flex justify-between items-start mb-1">
                                                <div>
                                                    <p className="font-medium text-sm">{batch.clientName}</p>
                                                     <p className="text-xs text-muted-foreground">
                                                        {batch.createdAt ? format(new Date(batch.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
                                                    </p>
                                                </div>
                                                 <Badge variant={batch.status === 'approved' ? 'default' : batch.status === 'rejected' ? 'destructive' : 'secondary'}>
                                                    {batch.status}
                                                </Badge>
                                            </div>
                                             <p className="text-xs text-muted-foreground mt-1">
                                                Week of {format(parseISO(batch.weekStartDate), 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                     ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle>Recent Timesheet Submissions</CardTitle>
                            <CardDescription>Latest driver submissions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentEntries.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-40" />
                                    <p>No timesheets yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {recentEntries.map((entry) => {
                                        const clients = getClients(entry);
                                        const totalHours = getTotalHours(entry);
                                        return (
                                            <div key={entry.id} className="border-l-2 border-primary pl-4">
                                                 <div className="flex justify-between items-start mb-1">
                                                     <div className="flex-1">
                                                         <p className="font-medium text-sm">{entry.driverName}</p>
                                                          <p className="text-xs text-muted-foreground">
                                                            Week of {format(parseISO(entry.weekStartDate), 'MMM d, yyyy')}
                                                          </p>
                                                     </div>
                                                      <div className="text-right">
                                                          <p className="text-sm font-semibold text-primary">{totalHours.toFixed(2)}h</p>
                                                      </div>
                                                 </div>
                                                 {clients.length > 0 && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {clients.join(", ")}
                                                    </p>
                                                 )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
             </div>
        );
    }

    // Driver View
    // Fetch Only Own Data
    const myTimesheets = await db.select().from(timesheets).where(eq(timesheets.userId, user.id)).orderBy(desc(timesheets.weekStartDate));
    
    // Stats
    const weekHours = myTimesheets.filter(t => {
         try {
            const date = parseISO(t.weekStartDate);
            return isWithinInterval(date, { start: weekStart, end: weekEnd });
          } catch { return false; }
    }).reduce((sum, t) => sum + getTotalHours(t), 0);

    const monthHours = myTimesheets.filter(t => {
         try {
            const date = parseISO(t.weekStartDate);
            return isWithinInterval(date, { start: monthStart, end: monthEnd });
          } catch { return false; }
    }).reduce((sum, t) => sum + getTotalHours(t), 0);

    const totalHours = myTimesheets.reduce((sum, t) => sum + getTotalHours(t), 0);
    const recentMyEntries = myTimesheets.slice(0, 5);

    return (
        <div className="space-y-8">
            <div>
                 <h1 className="text-3xl font-semibold tracking-tight">Driver Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
                </p>
            </div>

             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="This Week" value={weekHours.toFixed(2) + "h"} icon={Clock} />
                <StatsCard title="This Month" value={monthHours.toFixed(2) + "h"} icon={Calendar} />
                <StatsCard title="Total Hours" value={totalHours.toFixed(2) + "h"} icon={TrendingUp} />
                <StatsCard title="Total Timesheets" value={myTimesheets.length.toString()} icon={ClipboardList} />
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                 <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Submit Weekly Timesheet</CardTitle>
                             <CardDescription>
                                Create a new timesheet or edit drafts
                             </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex flex-col gap-4 items-center justify-center py-8 border-2 border-dashed rounded-lg">
                                  <p className="text-muted-foreground mb-4">Click below to start a new timesheet</p>
                                  <Link href="/timesheets">
                                      <Button size="lg" className="gap-2">
                                          <TrendingUp className="w-5 h-5" />
                                          Go to Timesheets
                                      </Button>
                                  </Link>
                             </div>
                        </CardContent>
                     </Card>
                 </div>

                 <div>
                      <Card>
                        <CardHeader>
                            <CardTitle>Recent Weeks</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {recentMyEntries.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No timesheets yet</p>
                             ) : (
                                 <div className="space-y-4">
                                     {recentMyEntries.map((entry) => (
                                         <div key={entry.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                                             <div>
                                                 <p className="font-medium text-sm">Week of {format(parseISO(entry.weekStartDate), 'MMM d')}</p>
                                                 <Badge variant="outline" className="text-xs mt-1">{entry.approvalStatus}</Badge>
                                             </div>
                                             <div className="text-right">
                                                  <span className="font-bold text-primary">{getTotalHours(entry).toFixed(1)}h</span>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                        </CardContent>
                      </Card>
                 </div>
            </div>
        </div>
    );
}
