'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from '@/components/auth/login-form';
import { RegistrationForm } from '@/components/auth/registration-form';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export function AuthTabs() {
    const [activeTab, setActiveTab] = useState('login');

    if (activeTab === 'forgot-password') {
        return (
            <div className="space-y-4">
                <div className="text-center text-sm text-muted-foreground mb-4">
                    Reset your password
                </div>
                <ForgotPasswordForm onBackToLogin={() => setActiveTab('login')} />
            </div>
        );
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
                <div className="space-y-4">
                    <div className="text-center text-sm text-muted-foreground mb-4">
                        Access your account
                    </div>
                    <LoginForm 
                        onRegisterClick={() => setActiveTab('register')} 
                        onForgotPasswordClick={() => setActiveTab('forgot-password')}
                    />
                </div>
            </TabsContent>
            <TabsContent value="register">
                <div className="space-y-4">
                    <div className="text-center text-sm text-muted-foreground mb-4">
                        Create a new driver account
                    </div>
                    <RegistrationForm onLoginClick={() => setActiveTab('login')} />
                </div>
            </TabsContent>
        </Tabs>
    );
}
