import 'next-auth';

declare module 'next-auth' {
    interface User {
        role?: string;
        firstName?: string | null;
        lastName?: string | null;
        phone?: string | null;
    }

    interface Session {
        user: {
            id: string;
            email: string;
            name?: string | null;
            image?: string | null;
            role?: string;
            firstName?: string | null;
            lastName?: string | null;
            phone?: string | null;
        };
    }
}
