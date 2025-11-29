'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, ArrowRight, Loader2, Clock, TestTube2, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { format } from 'date-fns';

interface FeatureGateProps {
  children: ReactNode;
  featureName: 'co-marketer' | 'co-writer';
}

export function FeatureGate({ children, featureName }: FeatureGateProps) {
  const { 
    hasCoMarketerAccess, 
    hasCoWriterAccess, 
    coMarketerAccessSource,
    coWriterAccessSource,
    isLoading,
    trial,
    startTrial,
  } = useCreditSummary();
  
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canAccess = featureName === 'co-marketer' ? hasCoMarketerAccess : hasCoWriterAccess;
  const accessSource = featureName === 'co-marketer' ? coMarketerAccessSource : coWriterAccessSource;

  if (canAccess) {
    return (
      <>
        {(accessSource === 'trial' || accessSource === 'admin_grant') && (
          <div className="mb-4 mx-4">
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm">
              {accessSource === 'trial' ? (
                <>
                  <TestTube2 className="h-4 w-4 text-primary" />
                  <span>Trial access active</span>
                  {trial?.trialExpiresAt && (
                    <span className="text-muted-foreground">
                      - expires {format(new Date(trial.trialExpiresAt), 'MMM d, yyyy')}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 text-primary" />
                  <span>Special access granted by admin</span>
                </>
              )}
            </div>
          </div>
        )}
        {children}
      </>
    );
  }

  const canStartTrial = trial?.canStartTrial && (
    (featureName === 'co-marketer' && trial.trialEnablesCoMarketer) ||
    (featureName === 'co-writer' && trial.trialEnablesCoWriter)
  );

  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    try {
      await startTrial();
    } finally {
      setIsStartingTrial(false);
    }
  };

  const featureDetails = {
    'co-marketer': {
      title: 'Co-Marketer',
      description: 'Create irresistible bonus materials, build sales funnels, and develop marketing strategies for your books.',
      features: [
        'Generate offer ideas with AI',
        'Develop workbooks, guides, and challenges',
        'Build sales funnels',
        'Create bonus content',
      ],
    },
    'co-writer': {
      title: 'Co-Writer',
      description: 'Generate compelling marketing content including sales pages, email sequences, and promotional materials.',
      features: [
        'Write sales page copy',
        'Create email sequences',
        'Generate book descriptions',
        'Develop promotional content',
      ],
    },
  };

  const details = featureDetails[featureName];

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Card className="border-2 border-dashed border-muted-foreground/25">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Upgrade to Access {details.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {details.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              What you get with {details.title}:
            </h4>
            <ul className="space-y-2">
              {details.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {canStartTrial && (
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5 text-primary" />
                <h4 className="font-medium">Try {details.title} Free</h4>
                <Badge variant="secondary" className="ml-auto">
                  <Clock className="h-3 w-3 mr-1" />
                  {trial?.trialDurationDays} days
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Start a free {trial?.trialDurationDays}-day trial to explore {details.title} features. 
                {trial?.trialOfferCreditsAmount && trial.trialOfferCreditsAmount > 0 && featureName === 'co-marketer' && (
                  <> You'll also get {trial.trialOfferCreditsAmount} offer credit{trial.trialOfferCreditsAmount > 1 ? 's' : ''} to try.</>
                )}
              </p>
              <Button 
                onClick={handleStartTrial} 
                disabled={isStartingTrial}
                className="w-full"
                size="lg"
              >
                {isStartingTrial ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Trial...
                  </>
                ) : (
                  <>
                    <TestTube2 className="mr-2 h-4 w-4" />
                    Start Free Trial
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                One trial per account. Trial credits expire when trial ends.
              </p>
            </div>
          )}

          {trial?.hasUsedTrial && !trial.isTrialActive && (
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-sm text-muted-foreground">
                You've already used your trial. Upgrade to a plan for continued access.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" variant={canStartTrial ? 'outline' : 'default'}>
              <Link href="/dashboard/settings">
                View Subscription Plans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Upgrade your subscription plan to unlock {details.title} and take your book marketing to the next level.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
