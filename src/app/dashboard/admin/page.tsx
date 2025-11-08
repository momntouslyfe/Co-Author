'use client';

import { useAuthUser } from '@/firebase/auth/use-user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { setAdmin } from '@/ai/flows/set-admin';


const formSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminPage() {
    const { user, isAdmin, isUserLoading } = useAuthUser();
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
        },
    });

    useEffect(() => {
        if (!isUserLoading && !isAdmin) {
            router.replace('/dashboard');
        }
    }, [user, isAdmin, isUserLoading, router]);

    const onSubmit = async (values: FormValues) => {
        setIsSubmitting(true);
        try {
            const result = await setAdmin({ email: values.email });
            toast({
                title: 'Admin Role Update',
                description: result.message,
            });
            form.reset();
        } catch (error) {
            console.error(error);
            toast({
                title: 'An Error Occurred',
                description: 'Failed to set admin role. Please check the console.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isUserLoading || !isAdmin) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold font-headline">Admin Panel</h1>
                <p className="text-muted-foreground">Application management and settings.</p>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>Grant Admin Privileges</CardTitle>
                    <CardDescription>
                        Enter the email of a registered user to make them an administrator. This tool is only available in the development environment.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <FormLabel>User Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="user@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Make Admin
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

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
