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
import { PaymentSettings } from '@/components/admin/payment-settings';
import { PaymentManagement } from '@/components/admin/payment-management';
import { CouponManager } from '@/components/admin/coupon-manager';
import { CurrencySettingsManager } from '@/components/admin/currency-settings';
import { CacheSettingsManager } from '@/components/admin/cache-settings';
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
          <TabsList className="grid w-full grid-cols-12">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="cache">Cache</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="routing">AI Routing</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="addon-credits">Addon Credits</TabsTrigger>
            <TabsTrigger value="allocate">Allocate Credits</TabsTrigger>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
            <TabsTrigger value="currency">Currency</TabsTrigger>
            <TabsTrigger value="payment-settings">Payment Setup</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <GlobalSettings />
          </TabsContent>

          <TabsContent value="cache">
            <CacheSettingsManager />
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

          <TabsContent value="coupons">
            <CouponManager />
          </TabsContent>

          <TabsContent value="currency">
            <CurrencySettingsManager />
          </TabsContent>

          <TabsContent value="payment-settings">
            <PaymentSettings />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
