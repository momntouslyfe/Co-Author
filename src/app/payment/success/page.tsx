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
        // Call verify endpoint which will auto-approve successful payments
        const response = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invoiceId }),
        });

        const data = await response.json();
        console.log('Payment verification response:', data);

        // Handle rejected, failed, or cancelled payments
        if (!data.success) {
          setPaymentStatus({
            success: false,
            message: data.error || 'Payment was rejected or failed.',
            orderId: data.payment?.orderId,
          });
          setVerifying(false);
          return;
        }

        // Show success for completed/approved payments (auto-approved)
        if (data.payment.status === 'completed' || data.payment.approvalStatus === 'approved') {
          setPaymentStatus({
            success: true,
            message: data.payment.message || 'Payment successful! Your credits have been added to your account.',
            orderId: data.payment.orderId,
          });
          setVerifying(false);
          return;
        }

        // Redirect to pending page if payment needs manual approval
        // This only happens when auto-approval fails (e.g., amount mismatch)
        if (data.payment.status === 'processing' && data.payment.approvalStatus === 'pending') {
          console.log('Payment requires manual approval, redirecting to pending page...');
          router.push(`/payment/pending?invoice_id=${invoiceId}&order_id=${data.payment.orderId}`);
          return;
        }

        // Any other status should be treated as an error or unknown state
        setPaymentStatus({
          success: false,
          message: `Unexpected payment status: ${data.payment.status}. Please contact support if you need assistance.`,
          orderId: data.payment.orderId,
        });
        setVerifying(false);
      } catch (error: any) {
        setPaymentStatus({
          success: false,
          message: error.message || 'Failed to verify payment. Please contact support.',
        });
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, router]);

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
            {paymentStatus?.success ? 'Payment Successful!' : 'Payment Verification Issue'}
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
                Your payment has been successfully processed and credits have been added to your account. You can start using them now!
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
