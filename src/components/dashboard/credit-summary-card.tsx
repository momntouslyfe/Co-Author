'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen, FileText, Plus } from 'lucide-react';
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
    ? (creditSummary.bookCreditsUsed / creditSummary.bookCreditsTotal) * 100
    : 0;

  const wordUsagePercent = creditSummary.wordCreditsTotal > 0
    ? (creditSummary.wordCreditsUsed / creditSummary.wordCreditsTotal) * 100
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-headline">Your Credits</CardTitle>
            <CardDescription>
              {creditSummary.subscriptionPlan
                ? `${creditSummary.subscriptionPlan.name} Plan`
                : 'No active subscription'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Book Creation Credits</span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/credits/purchase?type=books">
                <Plus className="mr-1 h-3 w-3" />
                Buy More
              </Link>
            </Button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {creditSummary.bookCreditsAvailable.toLocaleString()} remaining of{' '}
                {creditSummary.bookCreditsTotal.toLocaleString()} total
              </span>
              <span className="font-medium">
                {creditSummary.bookCreditsUsed.toLocaleString()} used
              </span>
            </div>
            <Progress value={bookUsagePercent} className="h-2" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Word Credits</span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/credits/purchase?type=words">
                <Plus className="mr-1 h-3 w-3" />
                Buy More
              </Link>
            </Button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {creditSummary.wordCreditsAvailable.toLocaleString()} remaining of{' '}
                {creditSummary.wordCreditsTotal.toLocaleString()} total
              </span>
              <span className="font-medium">
                {creditSummary.wordCreditsUsed.toLocaleString()} used
              </span>
            </div>
            <Progress value={wordUsagePercent} className="h-2" />
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Billing period</span>
            <span>
              {formatDate(creditSummary.currentPeriodStart)} -{' '}
              {formatDate(creditSummary.currentPeriodEnd)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
