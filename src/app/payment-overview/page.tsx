import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PaymentOverviewContent } from '@/components/payment-overview-content';

function LoadingFallback() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentOverviewPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentOverviewContent />
    </Suspense>
  );
}
