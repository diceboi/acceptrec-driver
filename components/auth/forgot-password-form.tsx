'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ForgotPasswordFormProps {
    onBackToLogin: () => void;
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to send reset link');
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="space-y-4 text-center">
                <div className="flex justify-center mb-4">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold">Check your email</h3>
                <p className="text-muted-foreground text-sm">
                    If an account exists for {email}, we have sent a password reset link to it.
                </p>
                <Button 
                    variant="outline" 
                    className="w-full mt-6" 
                    onClick={onBackToLogin}
                >
                    Back to Login
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">
                    Enter your email address and we'll send you a link to reset your password.
                </p>
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                    id="forgot-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>
            
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending reset link...
                    </>
                ) : (
                    'Send Reset Link'
                )}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground mt-4">
                Remember your password?{' '}
                <Button
                    variant="link"
                    className="p-0 h-auto font-normal"
                    onClick={(e) => {
                        e.preventDefault();
                        onBackToLogin();
                    }}
                >
                    Sign in
                </Button>
            </div>
        </form>
    );
}
