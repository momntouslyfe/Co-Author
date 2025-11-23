'use client';

import { BookOpen, FileText, Loader2 } from 'lucide-react';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { Card } from '@/components/ui/card';

export function FloatingCreditWidget() {
  const { creditSummary, isLoading } = useCreditSummary();

  if (isLoading) {
    return (
      <div className="fixed top-1/2 -translate-y-1/2 right-6 z-50">
        <Card className="p-3 shadow-lg border-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Loader2 className="h-4 w-4 animate-spin" />
        </Card>
      </div>
    );
  }

  if (!creditSummary) {
    return null;
  }

  return (
    <div className="fixed top-1/2 -translate-y-1/2 right-6 z-50">
      <Card className="p-4 shadow-lg border-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Credits Remaining
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Book Creation</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-primary">
                    {creditSummary.bookCreditsAvailable.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    of {creditSummary.bookCreditsTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">AI Words Credit</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-primary">
                    {creditSummary.wordCreditsAvailable.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    of {creditSummary.wordCreditsTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
