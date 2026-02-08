import Navigation from '@/components/navigation';
import ImpersonationBanner from '@/components/impersonation-banner';

export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Auth check is handled by middleware.ts

    return (
        <div className="min-h-screen bg-background">
            <ImpersonationBanner />
            <Navigation />
            <main className="max-w-6xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
