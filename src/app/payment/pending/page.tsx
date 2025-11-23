'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface PendingPaymentStatus {
  orderId?: string;
  status?: string;
  approvalStatus?: string;
  message?: string;
}

function PaymentPendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<PendingPaymentStatus | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPaymentStatus = useCallback(async (invoiceId: string, orderId?: string) => {
    setVerifying(true);
    try {
      const response = await fetch('/api/payment/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId, orderId }),
      });

      const data = await response.json();

      // Handle rejected, failed, or cancelled payments
      if (!data.success) {
        setPaymentStatus({
          orderId: data.payment?.orderId,
          status: data.payment?.status,
          approvalStatus: data.payment?.approvalStatus,
          message: data.error || 'Payment failed or was rejected.',
        });
        setVerifying(false);
        setLoading(false);
        return;
      }
      
      // If payment is completed/approved, redirect to success page
      if (data.payment.status === 'completed' || data.payment.approvalStatus === 'approved') {
        router.push(`/payment/success?invoice_id=${invoiceId}`);
        return;
      }
      
      // Payment is still pending
      setPaymentStatus({
        orderId: data.payment.orderId,
        status: data.payment.status,
        approvalStatus: data.payment.approvalStatus,
        message: data.payment.message || 'Payment is being processed and awaiting admin approval.',
      });
    } catch (error: any) {
      setPaymentStatus({
        message: error.message || 'Failed to check payment status. Please try again.',
      });
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const invoiceId = searchParams.get('invoice_id');
    const orderId = searchParams.get('order_id');

    if (!invoiceId && !orderId) {
      setPaymentStatus({
        message: 'No payment information found. Please check your email for payment details.',
      });
      setLoading(false);
      return;
    }

    checkPaymentStatus(invoiceId || '', orderId || undefined);
  }, [searchParams, checkPaymentStatus]);

  const handleCheckStatus = () => {
    const invoiceId = searchParams.get('invoice_id');
    const orderId = searchParams.get('order_id');
    if (invoiceId || orderId) {
      setLoading(true);
      checkPaymentStatus(invoiceId || '', orderId || undefined);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isRejected = paymentStatus?.status === 'failed' || paymentStatus?.approvalStatus === 'rejected';
  const isCancelled = paymentStatus?.status === 'cancelled';

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            {isRejected || isCancelled ? (
              <AlertCircle className="h-16 w-16 text-destructive" />
            ) : (
              <Clock className="h-16 w-16 text-orange-600" />
            )}
          </div>
          <CardTitle className="text-center text-2xl">
            {isRejected ? 'Payment Rejected' : isCancelled ? 'Payment Cancelled' : 'Payment Pending Approval'}
          </CardTitle>
          <CardDescription className="text-center">
            {paymentStatus?.message || 'Your payment is being verified and will be processed soon.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentStatus?.orderId && !isRejected && !isCancelled && (
            <Alert>
              <AlertDescription>
                <strong>Order ID:</strong> {paymentStatus.orderId}
                <br />
                <br />
                Your payment has been received and is awaiting admin approval. 
                You will receive your credits once the payment is approved by our team. 
                This usually takes a few minutes to a few hours.
              </AlertDescription>
            </Alert>
          )}

          {isRejected && (
            <Alert variant="destructive">
              <AlertDescription>
                {paymentStatus?.orderId && (
                  <>
                    <strong>Order ID:</strong> {paymentStatus.orderId}
                    <br />
                    <br />
                  </>
                )}
                <strong>Reason:</strong> {paymentStatus?.message}
                <br />
                <br />
                If you believe this is an error or need assistance, please contact our support team with your order details.
              </AlertDescription>
            </Alert>
          )}

          {isCancelled && (
            <Alert variant="destructive">
              <AlertDescription>
                This payment was cancelled. If you would like to make a purchase, please try again.
              </AlertDescription>
            </Alert>
          )}

          {!isRejected && !isCancelled && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What happens next?</strong>
                <br />
                1. Our team will verify your payment
                <br />
                2. Once approved, credits will be automatically added to your account
                <br />
                3. You will be able to use them immediately after approval
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 justify-center flex-wrap">
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
            {(isRejected || isCancelled) && (
              <Button variant="outline" onClick={() => router.push('/dashboard/credits/purchase')}>
                Try Again
              </Button>
            )}
            {!isRejected && !isCancelled && (searchParams.get('invoice_id') || searchParams.get('order_id')) && (
              <Button 
                variant="outline" 
                onClick={handleCheckStatus}
                disabled={verifying}
              >
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check Status
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentPendingPage() {
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
      <PaymentPendingContent />
    </Suspense>
  );
}
