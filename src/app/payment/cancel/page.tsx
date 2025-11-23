'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <XCircle className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-center text-2xl">Payment Cancelled</CardTitle>
          <CardDescription className="text-center">
            Your payment was cancelled. No charges have been made to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            If you encountered any issues during the payment process, please try again or contact our support team.
          </p>

          <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push('/dashboard/credits/purchase')}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
