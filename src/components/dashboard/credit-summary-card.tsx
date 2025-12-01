'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen, FileText, Plus, Gift, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthUser } from '@/firebase';
import type { CreditSummary } from '@/types/subscription';
import Link from 'next/link';

export function CreditSummaryCard() {
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
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
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-auto"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  More
                </>
              )}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div className="space-y-2">
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Words Credit</span>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Offer Creation Credits</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/credits/purchase?type=offers">
                    <Plus className="mr-1 h-3 w-3" />
                    Buy More
                  </Link>
                </Button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {creditSummary.offerCreditsAvailable.toLocaleString()} remaining of{' '}
                    {creditSummary.offerCreditsTotal.toLocaleString()} total
                  </span>
                  <span className="font-medium">
                    {creditSummary.offerCreditsUsed.toLocaleString()} used
                  </span>
                </div>
                <Progress value={offerUsagePercent} className="h-2" />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
