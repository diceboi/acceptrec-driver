'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpAction, RegisterState } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

const initialState: RegisterState = {
    success: false,
    error: '',
    fieldErrors: {},
};

interface RegistrationFormProps {
    onLoginClick?: () => void;
}

export function RegistrationForm({ onLoginClick }: RegistrationFormProps) {
    const [state, formAction, isPending] = useActionState(signUpAction, initialState);
    const router = useRouter();

    if (state.success) {
        return (
            <Alert className="bg-green-50 border-green-200 text-green-800">
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>
                    Registration successful. Please check your email to confirm your account.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <form action={formAction} className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                        required
                        disabled={isPending}
                        className={state.fieldErrors?.firstName ? "border-red-500" : ""}
                    />
                    {state.fieldErrors?.firstName && (
                        <p className="text-xs text-red-500">{state.fieldErrors.firstName[0]}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        required
                        disabled={isPending}
                        className={state.fieldErrors?.lastName ? "border-red-500" : ""}
                    />
                    {state.fieldErrors?.lastName && (
                        <p className="text-xs text-red-500">{state.fieldErrors.lastName[0]}</p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    required
                    disabled={isPending}
                    className={state.fieldErrors?.email ? "border-red-500" : ""}
                />
                {state.fieldErrors?.email && (
                    <p className="text-xs text-red-500">{state.fieldErrors.email[0]}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+1234567890"
                    required
                    disabled={isPending}
                    className={state.fieldErrors?.phone ? "border-red-500" : ""}
                />
                {state.fieldErrors?.phone && (
                    <p className="text-xs text-red-500">{state.fieldErrors.phone[0]}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="******"
                    required
                    disabled={isPending}
                    className={state.fieldErrors?.password ? "border-red-500" : ""}
                />
                {state.fieldErrors?.password && (
                    <p className="text-xs text-red-500">{state.fieldErrors.password[0]}</p>
                )}
            </div>

            {state.error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{state.error}</AlertDescription>
                </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                    </>
                ) : (
                    'Register as Driver'
                )}
            </Button>
            {onLoginClick && (
                <div className="text-center text-sm text-muted-foreground mt-4">
                    Already have an account?{' '}
                    <Button
                        variant="link"
                        className="p-0 h-auto font-normal"
                        onClick={(e) => {
                            e.preventDefault();
                            onLoginClick();
                        }}
                    >
                        Login
                    </Button>
                </div>
            )}
        </form>
    );
}
