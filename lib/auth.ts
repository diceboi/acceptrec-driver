import NextAuth, { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from './db';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';

export const authConfig: NextAuthConfig = {
    adapter: DrizzleAdapter(db),
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email) {
                    return null;
                }

                // In the original app, authentication was handled by Replit Auth
                // For now, we'll accept any email and create/find user
                const email = credentials.email as string;

                const [existingUser] = await db
                    .select()
                    .from(users)
                    .where(eq(users.email, email))
                    .limit(1);

                if (existingUser) {
                    return {
                        id: existingUser.id,
                        email: existingUser.email,
                        name: existingUser.firstName && existingUser.lastName
                            ? `${existingUser.firstName} ${existingUser.lastName}`
                            : existingUser.email.split('@')[0],
                        image: existingUser.profileImageUrl,
                        role: existingUser.role,
                    };
                }

                // Create new user if not exists (for development)
                const [newUser] = await db
                    .insert(users)
                    .values({
                        email,
                        role: 'driver',
                    })
                    .returning();

                return {
                    id: newUser.id,
                    email: newUser.email,
                    name: email.split('@')[0],
                    role: newUser.role,
                };
            },
        }),
    ],
    session: {
        strategy: 'database',
    },
    callbacks: {
        async session({ session, user }) {
            if (session.user) {
                // Fetch fresh user data to get role
                const [dbUser] = await db
                    .select()
                    .from(users)
                    .where(eq(users.email, session.user.email!))
                    .limit(1);

                session.user.id = user.id;
                session.user.role = dbUser?.role || 'driver';
                session.user.firstName = dbUser?.firstName;
                session.user.lastName = dbUser?.lastName;
                session.user.phone = dbUser?.phone;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Helper functions for authorization
export async function getSession() {
    return await auth();
}

export async function getCurrentUser() {
    const session = await getSession();
    return session?.user;
}

export async function requireAuth() {
    const session = await getSession();
    if (!session?.user) {
        throw new Error('Unauthorized');
    }
    return session.user;
}

export async function requireRole(allowedRoles: string[]) {
    const user = await requireAuth();
    if (!user.role || !allowedRoles.includes(user.role)) {
        throw new Error('Forbidden');
    }
    return user;
}
