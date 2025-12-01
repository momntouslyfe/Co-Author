'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check } from 'lucide-react';
import { useAuthUser } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import type { AddonCreditPlan, AddonCreditType } from '@/types/subscription';
import { getCurrencySymbol } from '@/lib/currency-utils';

function PurchaseCreditsContent() {
  const [plans, setPlans] = useState<AddonCreditPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const creditType = (searchParams.get('type') || 'words') as AddonCreditType;
  const { user, isUserLoading } = useAuthUser();
  const { toast } = useToast();

  const loadPlans = async () => {
    try {
      const response = await fetch(`/api/user/addon-credit-plans?type=${creditType}`);

      if (!response.ok) throw new Error('Failed to load credit plans');

      const data = await response.json();
      setPlans(data);
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

  useEffect(() => {
    loadPlans();
  }, [creditType]);

  const handlePurchase = async (planId: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to purchase credits.',
        variant: 'destructive',
      });
      return;
    }

    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      toast({
        title: 'Error',
        description: 'Plan not found.',
        variant: 'destructive',
      });
      return;
    }

    // Route to payment overview page instead of creating payment immediately
    const params = new URLSearchParams({
      addonId: plan.id,
      type: 'addon',
    });
    window.location.href = `/payment-overview?${params.toString()}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const getCreditTypeLabel = (type: AddonCreditType) => {
    switch (type) {
      case 'words':
        return 'AI Words';
      case 'books':
        return 'Book Creation';
      case 'offers':
        return 'Offers Creation';
      default:
        return 'Credits';
    }
  };

  const creditTypeLabel = getCreditTypeLabel(creditType);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline mb-2">
          Purchase {creditTypeLabel} Credits
        </h1>
        <p className="text-muted-foreground">
          Select a credit package to continue your writing journey
        </p>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No {creditTypeLabel.toLowerCase()} credit plans are currently available.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="font-headline">{plan.name}</CardTitle>
                    {plan.description && (
                      <CardDescription className="mt-2">{plan.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary">
                    {plan.creditAmount.toLocaleString()} {creditTypeLabel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{getCurrencySymbol(plan.currency)}{plan.price.toFixed(2)}</span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{plan.creditAmount.toLocaleString()} {creditTypeLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Never expires</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Use anytime</span>
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handlePurchase(plan.id)}
                  disabled={!user || isUserLoading}
                >
                  {isUserLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : !user ? (
                    'Login to Purchase'
                  ) : (
                    'Purchase Now'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PurchaseCreditsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    }>
      <PurchaseCreditsContent />
    </Suspense>
  );
}
