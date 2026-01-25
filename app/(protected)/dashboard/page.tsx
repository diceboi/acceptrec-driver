import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
    const session = await auth();
    const user = session?.user;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {user?.firstName || user?.name || 'User'}!
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            This Week
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0 hours</div>
                        <p className="text-xs text-muted-foreground">
                            Total hours logged this week
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pending Approval
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">
                            Timesheets awaiting approval
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            This Month
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0 hours</div>
                        <p className="text-xs text-muted-foreground">
                            Total hours logged this month
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Getting Started</CardTitle>
                    <CardDescription>
                        Your timesheet management system is ready to use
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p>
                        This is the Next.js migration of the Accept Timesheet Processing application.
                        The core features have been set up:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Database schema migrated with Drizzle ORM</li>
                        <li>Authentication configured with NextAuth.js</li>
                        <li>Role-based access control (driver, admin, super_admin, client)</li>
                        <li>Responsive design with Tailwind CSS</li>
                        <li>shadcn/ui components integrated</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-4">
                        <strong>Next steps:</strong> Configure your environment variables in .env.local,
                        migrate the remaining pages and API routes, and test with your database.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
