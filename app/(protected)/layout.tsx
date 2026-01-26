import Navigation from '@/components/navigation';

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Auth check is handled by middleware.ts
    
    return (
        <div className="min-h-screen bg-background">
            <Navigation />
            <main className="max-w-6xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
