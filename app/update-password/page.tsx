import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UpdatePasswordForm } from '@/components/auth/update-password-form';
import Image from 'next/image';

export default function UpdatePasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
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
                    <CardTitle className="text-3xl font-bold tracking-tight">Set New Password</CardTitle>
                    <CardDescription className="text-lg">
                        Please enter your new password below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UpdatePasswordForm />
                </CardContent>
            </Card>

            <div className="fixed bottom-4 text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Accept Recruitment
            </div>
        </div>
    );
}
