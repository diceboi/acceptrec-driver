import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthTabs } from '@/components/auth/auth-tabs';
import Image from 'next/image';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-muted/40">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/Accept Stacked Logo with Strapline_CMYK300_1761553395131.jpg"
              alt="Accept Timesheet Processing"
              width={220}
              height={110}
              className="h-auto"
              priority
            />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome</CardTitle>
          <CardDescription className="text-lg">
            Manage your timesheets efficiently
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthTabs />
        </CardContent>
      </Card>

      {/* Footer / Copyright if needed */}
      <div className="fixed bottom-4 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Accept Recruitment
      </div>
    </div>
  );
}
