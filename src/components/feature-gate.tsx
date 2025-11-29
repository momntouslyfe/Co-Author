'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useCreditSummary } from '@/contexts/credit-summary-context';

interface FeatureGateProps {
  children: ReactNode;
  featureName: 'co-marketer' | 'co-writer';
}

export function FeatureGate({ children, featureName }: FeatureGateProps) {
  const { hasCoMarketerAccess, hasCoWriterAccess, isLoading } = useCreditSummary();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canAccess = featureName === 'co-marketer' ? hasCoMarketerAccess : hasCoWriterAccess;

  if (canAccess) {
    return <>{children}</>;
  }

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

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
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
