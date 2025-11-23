'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuthUser } from '@/firebase';
import { Loader2, Calendar, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import type { SubscriptionPlan } from '@/types/subscription';
import { PaymentStatusCard } from '@/components/dashboard/payment-status-card';
import { getCurrencySymbol } from '@/lib/currency-utils';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscription: {
    planEffectiveStart: Date;
    planEffectiveEnd: Date;
    billingCycleStart: Date;
    billingCycleEnd: Date;
    isExpired: boolean;
  } | null;
  plan: SubscriptionPlan | null;
}

export function BillingSettings() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useAuthUser();
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = await user!.getIdToken();

      const [statusResponse, plansResponse] = await Promise.all([
        fetch('/api/user/subscription-status', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/user/subscription-plans'),
      ]);

      if (!statusResponse.ok || !plansResponse.ok) {
        throw new Error('Failed to load billing data');
      }

      const statusData = await statusResponse.json();
      const plansData = await plansResponse.json();

      if (statusData.subscription) {
        statusData.subscription.planEffectiveStart = new Date(statusData.subscription.planEffectiveStart);
        statusData.subscription.planEffectiveEnd = new Date(statusData.subscription.planEffectiveEnd);
        statusData.subscription.billingCycleStart = new Date(statusData.subscription.billingCycleStart);
        statusData.subscription.billingCycleEnd = new Date(statusData.subscription.billingCycleEnd);
      }

      setSubscriptionStatus(statusData);
      setAvailablePlans(plansData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchasePlan = async (planId: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to purchase a subscription.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setPurchasing(planId);
      const token = await user.getIdToken();

      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: planId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create payment');
      }

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('Invalid payment response');
      }
    } catch (error: any) {
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>Your active subscription plan and billing information</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptionStatus?.hasActiveSubscription && subscriptionStatus.plan && subscriptionStatus.subscription ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{subscriptionStatus.plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {subscriptionStatus.plan.description}
                  </p>
                </div>
                <Badge variant="default" className="bg-green-500">Active</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Plan Started</span>
                  </div>
                  <p className="font-medium" suppressHydrationWarning>
                    {isMounted ? format(subscriptionStatus.subscription.planEffectiveStart, 'PPP') : '...'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Expires On</span>
                  </div>
                  <p className="font-medium" suppressHydrationWarning>
                    {isMounted ? format(subscriptionStatus.subscription.planEffectiveEnd, 'PPP') : '...'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Next Payment Date</span>
                  </div>
                  <p className="font-medium" suppressHydrationWarning>
                    {isMounted ? format(subscriptionStatus.subscription.billingCycleEnd, 'PPP') : '...'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>Monthly Price</span>
                  </div>
                  <p className="font-medium">
                    {getCurrencySymbol(subscriptionStatus.plan.currency)}{subscriptionStatus.plan.price.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Plan Includes:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {subscriptionStatus.plan.bookCreditsPerMonth.toLocaleString()} book credits per month
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {subscriptionStatus.plan.wordCreditsPerMonth.toLocaleString()} AI Words Credit per month
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't have an active subscription plan. Choose a plan below to get started with AI-powered book creation.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Subscription Plans</CardTitle>
          <CardDescription>
            {subscriptionStatus?.hasActiveSubscription
              ? 'Upgrade or switch to a different plan'
              : 'Choose a plan to start creating books with AI'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availablePlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscription plans are currently available.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availablePlans.map((plan) => (
                <Card key={plan.id} className="relative">
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-3xl font-bold">
                      {getCurrencySymbol(plan.currency)}{plan.price.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </div>

                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {plan.bookCreditsPerMonth} book credits/month
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {plan.wordCreditsPerMonth.toLocaleString()} AI Words Credit/month
                      </li>
                    </ul>

                    <Button
                      className="w-full"
                      onClick={() => handlePurchasePlan(plan.id)}
                      disabled={purchasing === plan.id || subscriptionStatus?.plan?.id === plan.id}
                    >
                      {purchasing === plan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : subscriptionStatus?.plan?.id === plan.id ? (
                        'Current Plan'
                      ) : (
                        'Subscribe Now'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Activity */}
      <PaymentStatusCard />
    </div>
  );
}
