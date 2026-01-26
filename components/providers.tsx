'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                queryFn: async ({ queryKey }) => {
                    const url = queryKey[0] as string;
                    const res = await fetch(url);
                    if (!res.ok) {
                        const errorText = await res.text();
                        throw new Error(errorText || `${res.status} ${res.statusText}`);
                    }
                    return res.json();
                },
                refetchInterval: false,
                refetchOnWindowFocus: false,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                disableTransitionOnChange
            >
                {children}
            </ThemeProvider>
        </QueryClientProvider>
    );
}
