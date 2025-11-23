'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

function PaymentSuccessContent() {
  const [verifying, setVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<{
    success: boolean;
    message: string;
    orderId?: string;
  } | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const verifyPayment = async () => {
      const invoiceId = searchParams.get('invoice_id');

      if (!invoiceId) {
        setPaymentStatus({
          success: false,
          message: 'No payment information found.',
        });
        setVerifying(false);
        return;
      }

      try {
        const response = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invoiceId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Payment verification failed');
        }

        const data = await response.json();

        setPaymentStatus({
          success: true,
          message: data.payment.message || 'Payment successful! Your credits will be added once approved by admin.',
          orderId: data.payment.orderId,
        });
      } catch (error: any) {
        setPaymentStatus({
          success: false,
          message: error.message || 'Failed to verify payment. Please contact support.',
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (verifying) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verifying Payment...</h2>
            <p className="text-muted-foreground">Please wait while we verify your payment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            {paymentStatus?.success ? (
              <CheckCircle className="h-16 w-16 text-green-600" />
            ) : (
              <AlertCircle className="h-16 w-16 text-destructive" />
            )}
          </div>
          <CardTitle className="text-center text-2xl">
            {paymentStatus?.success ? 'Payment Received!' : 'Payment Verification Issue'}
          </CardTitle>
          <CardDescription className="text-center">
            {paymentStatus?.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentStatus?.success && paymentStatus.orderId && (
            <Alert>
              <AlertDescription>
                <strong>Order ID:</strong> {paymentStatus.orderId}
                <br />
                Your payment has been received and is awaiting admin approval. You will receive your credits once the payment is approved.
              </AlertDescription>
            </Alert>
          )}

          {!paymentStatus?.success && (
            <Alert variant="destructive">
              <AlertDescription>
                If you believe this is an error or if money was deducted from your account, please contact our support team with the transaction details.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
            {!paymentStatus?.success && (
              <Button variant="outline" onClick={() => router.push('/dashboard/credits/purchase')}>
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
