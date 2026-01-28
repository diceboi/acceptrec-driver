'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { users } from '@/shared/schema';

const registerSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone number is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type RegisterState = {
    success?: boolean;
    error?: string;
    fieldErrors?: {
        [key: string]: string[];
    };
};

export async function signUpAction(prevState: RegisterState, formData: FormData): Promise<RegisterState> {
    const validatedFields = registerSchema.safeParse({
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password'),
    });

    if (!validatedFields.success) {
        return {
            error: 'Validation failed',
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { firstName, lastName, email, phone, password } = validatedFields.data;
    const supabase = await createClient();

    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                role: 'driver', // Default metadata, though we mainly trust our DB
            },
        },
    });

    if (authError) {
        return {
            error: authError.message
        };
    }

    if (!authData.user || !authData.user.id) {
        return {
            error: "Something went wrong during registration."
        }
    }

    // 2. Create user in our database
    try {
        await db.insert(users).values({
            id: authData.user.id,
            email: email,
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            role: 'driver',
        });
    } catch (dbError: any) {
        console.error("Database insertion error:", dbError);
        // If DB insert fails, we might want to cleanup the auth user, but for now just report error.
        // In a real prod env, we'd want a transaction or eventual consistency check.
        return {
            error: 'Account created but failed to save profile details. Please contact support.',
        };
    }

    return {
        success: true,
    };
}
