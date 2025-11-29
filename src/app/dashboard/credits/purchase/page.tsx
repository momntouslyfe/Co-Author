'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, Lock } from 'lucide-react';
import { useAuthUser } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import type { AddonCreditPlan, AddonCreditType } from '@/types/subscription';
import { getCurrencySymbol } from '@/lib/currency-utils';

function getCreditTypeLabel(creditType: AddonCreditType): string {
  switch (creditType) {
    case 'words': return 'AI Words Credit';
    case 'books': return 'Book Creation Credits';
    case 'offers': return 'Offer Creation Credits';
    default: return 'Credits';
  }
}

function getCreditTypeUnit(creditType: AddonCreditType): string {
  switch (creditType) {
    case 'words': return 'AI Words';
    case 'books': return 'book projects';
    case 'offers': return 'offer credits';
    default: return 'credits';
  }
}

function PurchaseCreditsContent() {
  const [plans, setPlans] = useState<AddonCreditPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const creditType = (searchParams.get('type') || 'words') as AddonCreditType;
  const { user, isUserLoading } = useAuthUser();
  const { toast } = useToast();

  const loadPlans = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    try {
      setAccessError(null);
      setIsLoading(true);
      
      const token = await user.getIdToken();
      const response = await fetch(`/api/user/addon-credit-plans?type=${creditType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          setAccessError(errorData.error || 'You do not have access to purchase these credits.');
          return;
        }
        if (response.status === 401) {
          setAccessError('Please log in to view credit plans.');
          return;
        }
        throw new Error(errorData.error || 'Failed to load credit plans');
      }

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
    if (!isUserLoading) {
      loadPlans();
    }
  }, [creditType, user, isUserLoading]);

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

  if (accessError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-headline mb-2">
            Purchase {getCreditTypeLabel(creditType)}
          </h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {accessError}
            </p>
            <Button onClick={() => router.push('/dashboard/subscription')}>
              View Subscription Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline mb-2">
          Purchase {getCreditTypeLabel(creditType)}
        </h1>
        <p className="text-muted-foreground">
          Select a credit package to continue your writing journey
        </p>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No {getCreditTypeLabel(creditType).toLowerCase()} plans are currently available.
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
                    {plan.creditAmount.toLocaleString()} {getCreditTypeUnit(creditType)}
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
                      <span>{plan.creditAmount.toLocaleString()} {getCreditTypeUnit(creditType)}</span>
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
