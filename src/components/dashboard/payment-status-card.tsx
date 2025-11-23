'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Clock, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthUser, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface Payment {
  id: string;
  orderId: string;
  chargedAmount: string;
  status: string;
  approvalStatus: string;
  createdAt: any;
  rejectionReason?: string;
  invoiceId?: string;
}

export function PaymentStatusCard() {
  const { user } = useAuthUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadRecentPayments();
    }
  }, [user]);

  const loadRecentPayments = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const paymentsQuery = query(
        collection(firestore, 'payments'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(3)
      );

      const snapshot = await getDocs(paymentsQuery);
      const paymentData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((p: any) => {
          // Filter out malformed records missing critical fields
          if (!p.orderId) {
            console.warn('Payment record missing orderId:', p.id);
            return false;
          }
          return true;
        }) as Payment[];

      setPayments(paymentData);
    } catch (err) {
      console.error('Error loading payments:', err);
      setError('Unable to load payment information. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (payment: Payment) => {
    setChecking(payment.orderId);
    setError(null);

    try {
      const response = await fetch('/api/payment/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: payment.orderId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to check payment status');
      }

      const data = await response.json();

      if (data.payment) {
        // Update the payment in state
        setPayments(prev => 
          prev.map(p => 
            p.orderId === payment.orderId 
              ? { ...p, ...data.payment }
              : p
          )
        );

        // If approved, redirect to success page only if we have invoiceId
        if ((data.payment.status === 'completed' || data.payment.approvalStatus === 'approved') && data.payment.invoiceId) {
          router.push(`/payment/success?invoice_id=${data.payment.invoiceId}`);
        } else if (!data.payment.invoiceId) {
          setError('Payment data is incomplete. Please contact support with your order ID.');
        }
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
      setError('Unable to check payment status. Please try again or contact support.');
    } finally {
      setChecking(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      completed: { variant: 'default', icon: CheckCircle },
      processing: { variant: 'secondary', icon: Clock },
      pending: { variant: 'outline', icon: Clock },
      failed: { variant: 'destructive', icon: XCircle },
      cancelled: { variant: 'destructive', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getApprovalBadge = (approvalStatus: string) => {
    const approvalConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      approved: { variant: 'default' },
      pending: { variant: 'secondary' },
      rejected: { variant: 'destructive' },
    };

    const config = approvalConfig[approvalStatus] || approvalConfig.pending;

    return (
      <Badge variant={config.variant} className="w-fit">
        {approvalStatus || 'N/A'}
      </Badge>
    );
  };

  if (!user) {
    return null;
  }

  // Show card if: there's an error, currently loading, or there are any recent payments
  const hasRecentPayments = payments.length > 0;
  const shouldShowCard = error || loading || hasRecentPayments;

  if (!shouldShowCard) {
    return null;
  }

  // Filter for display
  const pendingPayments = payments.filter(
    p => p.orderId && (p.status === 'processing' || p.status === 'pending') && p.approvalStatus === 'pending'
  );

  // Also show recently completed payments (for confirmation)
  const recentCompletedPayments = payments.filter(
    p => p.orderId && (p.status === 'completed' || p.approvalStatus === 'approved')
  ).slice(0, 1); // Show only the most recent completed payment

  const displayPayments = [...pendingPayments, ...recentCompletedPayments];

  const hasPendingPayments = pendingPayments.length > 0;

  return (
    <Card className={hasPendingPayments 
      ? "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10 dark:border-yellow-900"
      : "border-green-200 bg-green-50/50 dark:bg-green-950/10 dark:border-green-900"
    }>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasPendingPayments ? (
            <>
              <Clock className="h-5 w-5 text-yellow-600" />
              Pending Payments
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              Recent Payments
            </>
          )}
        </CardTitle>
        <CardDescription>
          {hasPendingPayments 
            ? 'Payments awaiting admin approval'
            : 'Your recent payment activity'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : displayPayments.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No recent payments
          </div>
        ) : (
          <>
            {displayPayments.map(payment => (
                <div key={payment.orderId} className="border rounded-lg p-4 bg-white dark:bg-gray-900 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">৳{payment.chargedAmount || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">
                        Order: {payment.orderId}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      {getStatusBadge(payment.status)}
                      {getApprovalBadge(payment.approvalStatus)}
                    </div>
                  </div>

                  {payment.rejectionReason && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Rejected:</strong> {payment.rejectionReason}
                      </AlertDescription>
                    </Alert>
                  )}

                  {!payment.invoiceId && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Payment data incomplete. Please contact support with Order ID: {payment.orderId}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Only show action buttons for pending payments */}
                  {(payment.status === 'processing' || payment.status === 'pending') && payment.approvalStatus === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => checkPaymentStatus(payment)}
                        disabled={checking === payment.orderId}
                      >
                        {checking === payment.orderId ? (
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
                      {payment.invoiceId ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/payment/pending?invoice_id=${payment.invoiceId}&order_id=${payment.orderId}`)}
                        >
                          View Details
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled
                          title="Invoice ID missing - please contact support"
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Show confirmation for completed payments */}
                  {(payment.status === 'completed' || payment.approvalStatus === 'approved') && (
                    <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        Payment approved! Credits have been added to your account.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
