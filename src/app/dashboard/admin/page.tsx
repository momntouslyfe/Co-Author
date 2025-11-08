'use client';

import { useAuthUser } from '@/firebase/auth/use-user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
    const { user, isAdmin, isUserLoading } = useAuthUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !isAdmin) {
            router.replace('/dashboard');
        }
    }, [user, isAdmin, isUserLoading, router]);

    if (isUserLoading || !isAdmin) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 font-headline">Admin Panel</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Welcome, Admin!</CardTitle>
                    <CardDescription>
                        This is your dedicated control center for managing the application.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p>
                        Future admin-specific components and settings will be available here.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
