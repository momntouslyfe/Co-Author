'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/admin-header';
import { APIKeysManager } from '@/components/admin/api-keys-manager';
import { AIRoutingManager } from '@/components/admin/ai-routing-manager';
import { UserManagement } from '@/components/admin/user-management';
import { GlobalSettings } from '@/components/admin/global-settings';
import { SubscriptionPlanManager } from '@/components/admin/subscription-plan-manager';
import { AddonCreditPlanManager } from '@/components/admin/addon-credit-plan-manager';
import { CreditAllocator } from '@/components/admin/credit-allocator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-secondary">
      <AdminHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-headline font-bold">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Manage API keys, users, and application settings
          </p>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="routing">AI Routing</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="addon-credits">Addon Credits</TabsTrigger>
            <TabsTrigger value="allocate">Allocate Credits</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <GlobalSettings />
          </TabsContent>

          <TabsContent value="api-keys">
            <APIKeysManager />
          </TabsContent>

          <TabsContent value="routing">
            <AIRoutingManager />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionPlanManager />
          </TabsContent>

          <TabsContent value="addon-credits">
            <AddonCreditPlanManager />
          </TabsContent>

          <TabsContent value="allocate">
            <CreditAllocator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
