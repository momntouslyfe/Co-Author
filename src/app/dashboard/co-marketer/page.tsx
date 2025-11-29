'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, TrendingUp, ArrowRight } from 'lucide-react';
import { FeatureGate } from '@/components/feature-gate';

export default function CoMarketerPage() {
  return (
    <FeatureGate featureName="co-marketer">
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Co-Marketer</h1>
        <p className="text-muted-foreground mt-2">
          Create irresistible offers and strategic book funnels to maximize your book&apos;s impact and revenue.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Offer Creator</CardTitle>
                <CardDescription>Generate bonus material ideas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create irresistible bonus materials to enhance your book offer. Generate ideas for workbooks, 
              cheat sheets, templates, quick-start guides, and 9 more categories to make your offer high-converting.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/dashboard/co-marketer/offer-creator">
                  Open Offer Creator
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Funnel Creator</CardTitle>
                <CardDescription>Build your book value ladder</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Design a 7-step book funnel that guides readers through their learning journey. 
              Generate strategic follow-up book ideas based on the value ladder principle: 
              solving one problem creates a new problem to solve.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/dashboard/co-marketer/funnel-creator">
                  Open Funnel Creator
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </FeatureGate>
  );
}
