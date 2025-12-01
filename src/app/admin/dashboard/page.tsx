'use client';

import { useEffect, useState } from 'react';
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
import { FacebookIntegration } from '@/components/admin/facebook-integration';
import { EmailIntegration } from '@/components/admin/email-integration';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  Settings,
  Key,
  Route,
  Users,
  CreditCard,
  Package,
  Gift,
  Ticket,
  DollarSign,
  Wallet,
  ShoppingCart,
  Menu,
  ChevronRight,
} from 'lucide-react';

const navigationItems = [
  { id: 'settings', label: 'Settings', icon: Settings, category: 'General' },
  { id: 'api-keys', label: 'API Keys', icon: Key, category: 'General' },
  { id: 'routing', label: 'AI Routing', icon: Route, category: 'General' },
  { id: 'users', label: 'Users', icon: Users, category: 'Users & Credits' },
  { id: 'allocate', label: 'Allocate Credits', icon: Gift, category: 'Users & Credits' },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, category: 'Plans' },
  { id: 'addon-credits', label: 'Addon Credits', icon: Package, category: 'Plans' },
  { id: 'coupons', label: 'Coupons', icon: Ticket, category: 'Plans' },
  { id: 'currency', label: 'Currency', icon: DollarSign, category: 'Payments' },
  { id: 'payment-settings', label: 'Payment Gateway', icon: Wallet, category: 'Payments' },
  { id: 'payments', label: 'Orders', icon: ShoppingCart, category: 'Payments' },
  { id: 'facebook', label: 'Facebook Pixel', icon: () => <FacebookIcon />, category: 'Integrations' },
  { id: 'email', label: 'Email', icon: () => <EmailIcon />, category: 'Integrations' },
];

const FacebookIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const EmailIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const categories = ['General', 'Users & Credits', 'Plans', 'Payments', 'Integrations'];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('settings');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    }
  }, [router]);

  const renderContent = () => {
    switch (activeTab) {
      case 'settings':
        return <GlobalSettings />;
      case 'api-keys':
        return <APIKeysManager />;
      case 'routing':
        return <AIRoutingManager />;
      case 'users':
        return <UserManagement />;
      case 'subscriptions':
        return <SubscriptionPlanManager />;
      case 'addon-credits':
        return <AddonCreditPlanManager />;
      case 'allocate':
        return <CreditAllocator />;
      case 'coupons':
        return <CouponManager />;
      case 'currency':
        return <CurrencySettingsManager />;
      case 'payment-settings':
        return <PaymentSettings />;
      case 'payments':
        return <PaymentManagement />;
      case 'facebook':
        return <FacebookIntegration />;
      case 'email':
        return <EmailIntegration />;
      default:
        return <GlobalSettings />;
    }
  };

  const NavContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <ScrollArea className="h-full py-4">
      <div className="space-y-6 px-3">
        {categories.map((category) => (
          <div key={category}>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {category}
            </h3>
            <div className="space-y-1">
              {navigationItems
                .filter((item) => item.category === category)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant={activeTab === item.id ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-start gap-3 text-left',
                        activeTab === item.id && 'bg-primary/10 text-primary font-medium'
                      )}
                      onClick={() => {
                        setActiveTab(item.id);
                        onItemClick?.();
                      }}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {activeTab === item.id && (
                        <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0" />
                      )}
                    </Button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  const activeItem = navigationItems.find((item) => item.id === activeTab);

  return (
    <div className="min-h-screen bg-secondary">
      <AdminHeader />
      
      <div className="flex">
        <aside className="hidden lg:block w-64 border-r bg-background min-h-[calc(100vh-64px)] sticky top-16">
          <NavContent />
        </aside>

        <main className="flex-1 min-h-[calc(100vh-64px)]">
          <div className="lg:hidden border-b bg-background sticky top-16 z-10">
            <div className="container flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                {activeItem && (
                  <>
                    {(() => {
                      const Icon = activeItem.icon;
                      return <Icon className="h-5 w-5 text-primary" />;
                    })()}
                    <span className="font-medium">{activeItem.label}</span>
                  </>
                )}
              </div>
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <div className="border-b px-6 py-4">
                    <h2 className="font-semibold">Admin Menu</h2>
                  </div>
                  <NavContent onItemClick={() => setIsMobileMenuOpen(false)} />
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="container mx-auto px-4 py-6 lg:py-8">
            <div className="mb-6 hidden lg:block">
              <h2 className="text-2xl font-headline font-bold">
                {activeItem?.label || 'Dashboard'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {activeItem?.category} settings and configuration
              </p>
            </div>

            <div className="max-w-5xl">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
