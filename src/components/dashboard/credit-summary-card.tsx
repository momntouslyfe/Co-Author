'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen, FileText, Plus, Gift } from 'lucide-react';
import { useAuthUser } from '@/firebase';
import type { CreditSummary } from '@/types/subscription';
import Link from 'next/link';

export function CreditSummaryCard() {
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthUser();
  const { toast } = useToast();

  const loadCreditSummary = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/user/credit-summary', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load credit summary');

      const data = await response.json();
      setCreditSummary(data);
    } catch (error: any) {
      console.error('Credit summary error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load credit information',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCreditSummary();
  }, [user]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!creditSummary) {
    return null;
  }

  const bookUsagePercent = creditSummary.bookCreditsTotal > 0
    ? ((creditSummary.bookCreditsTotal - creditSummary.bookCreditsAvailable) / creditSummary.bookCreditsTotal) * 100
    : 0;

  const wordUsagePercent = creditSummary.wordCreditsTotal > 0
    ? ((creditSummary.wordCreditsTotal - creditSummary.wordCreditsAvailable) / creditSummary.wordCreditsTotal) * 100
    : 0;

  const offerUsagePercent = creditSummary.offerCreditsTotal > 0
    ? ((creditSummary.offerCreditsTotal - creditSummary.offerCreditsAvailable) / creditSummary.offerCreditsTotal) * 100
    : 0;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {creditSummary.subscriptionPlan
                ? `${creditSummary.subscriptionPlan.name} Plan`
                : 'No active subscription'}
            </span>
            <span className="text-xs text-muted-foreground">
              ({formatDate(creditSummary.currentPeriodStart)} - {formatDate(creditSummary.currentPeriodEnd)})
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm">
                <span className="font-semibold">{creditSummary.bookCreditsAvailable}</span>
                <span className="text-muted-foreground">/{creditSummary.bookCreditsTotal} Books</span>
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm">
                <span className="font-semibold">{creditSummary.wordCreditsAvailable.toLocaleString()}</span>
                <span className="text-muted-foreground">/{creditSummary.wordCreditsTotal.toLocaleString()} Words</span>
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              <span className="text-sm">
                <span className="font-semibold">{creditSummary.offerCreditsAvailable}</span>
                <span className="text-muted-foreground">/{creditSummary.offerCreditsTotal} Offers</span>
              </span>
            </div>
            
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/credits/purchase">
                <Plus className="mr-1 h-3 w-3" />
                Buy Credits
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
