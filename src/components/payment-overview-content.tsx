'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuthUser } from '@/firebase';
import { Loader2, Tag, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { SubscriptionPlan, AddonCreditPlan, ValidateCouponResponse } from '@/types/subscription';
import { getCurrencySymbol } from '@/lib/currency-utils';

export function PaymentOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useAuthUser();
  const { toast } = useToast();

  const planId = searchParams.get('planId');
  const addonId = searchParams.get('addonId');
  const planType = searchParams.get('type'); // 'subscription' or 'addon'

  const [plan, setPlan] = useState<SubscriptionPlan | AddonCreditPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponValidation, setCouponValidation] = useState<ValidateCouponResponse | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (!planId && !addonId) {
      router.push('/dashboard/settings');
      return;
    }

    // Wait for user to load before redirecting
    if (isUserLoading) {
      return;
    }

    if (!user) {
      router.push('/');
      return;
    }

    loadPlanDetails();
  }, [planId, addonId, user, isUserLoading, router]);

  const loadPlanDetails = async () => {
    try {
      setLoading(true);
      
      let planData;
      if (planType === 'subscription' && planId) {
        const response = await fetch('/api/user/subscription-plans');
        if (!response.ok) throw new Error('Failed to load plan');
        const data = await response.json();
        planData = data.find((p: SubscriptionPlan) => p.id === planId);
      } else if (planType === 'addon' && addonId) {
        const response = await fetch('/api/user/addon-credit-plans');
        if (!response.ok) throw new Error('Failed to load addon plan');
        const data = await response.json();
        planData = data.find((p: AddonCreditPlan) => p.id === addonId);
      }

      if (!planData) {
        throw new Error('Plan not found');
      }

      setPlan(planData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      router.push('/dashboard/settings');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a coupon code',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    try {
      setValidatingCoupon(true);
      setCouponValidation(null);

      const token = await user.getIdToken();
      const response = await fetch('/api/coupon/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: couponCode,
          subscriptionPlanId: planType === 'subscription' ? planId : undefined,
          addonPlanId: planType === 'addon' ? addonId : undefined,
        }),
      });

      const data: ValidateCouponResponse = await response.json();

      if (data.valid) {
        setCouponValidation(data);
        toast({
          title: 'Success',
          description: 'Coupon applied successfully!',
        });
      } else {
        toast({
          title: 'Invalid Coupon',
          description: data.error || 'This coupon code is not valid',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to validate coupon',
        variant: 'destructive',
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponValidation(null);
  };

  const handlePayNow = async () => {
    if (!user || !plan) return;

    try {
      setProcessingPayment(true);
      const token = await user.getIdToken();

      const payload: any = {
        couponCode: couponValidation?.valid ? couponCode : undefined,
      };

      if (planType === 'subscription') {
        payload.planId = planId;
      } else {
        payload.addonId = addonId;
      }

      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create payment');
      }

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('Invalid payment response');
      }
    } catch (error: any) {
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
      setProcessingPayment(false);
    }
  };

  if (loading) {
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

  if (!plan) {
    return null;
  }

  const originalPrice = plan.price;
  const discount = couponValidation?.discountAmount || 0;
  const finalPrice = couponValidation?.finalAmount ?? originalPrice;
  const currency = getCurrencySymbol(plan.currency);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          disabled={processingPayment}
        >
          ← Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Overview
          </CardTitle>
          <CardDescription>
            Review your order and apply a coupon code before proceeding to payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Details */}
          <div>
            <h3 className="font-semibold mb-2">Order Details</h3>
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">{plan.name}</span>
                <span className="font-medium">{currency}{originalPrice}</span>
              </div>
              {plan.description && (
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              )}
              {'bookCreditsPerMonth' in plan && (
                <div className="text-sm space-y-1 mt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book Credits per Month:</span>
                    <span>{plan.bookCreditsPerMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Word Credits per Month:</span>
                    <span>{plan.wordCreditsPerMonth.toLocaleString()}</span>
                  </div>
                </div>
              )}
              {'creditAmount' in plan && (
                <div className="text-sm space-y-1 mt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credits:</span>
                    <span>{plan.creditAmount.toLocaleString()} {plan.type} credits</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Coupon Code Section */}
          <div>
            <Label htmlFor="couponCode" className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4" />
              Have a coupon code?
            </Label>
            {couponValidation?.valid ? (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-green-800 dark:text-green-200">
                    Coupon <strong>{couponCode}</strong> applied!
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCoupon}
                    disabled={processingPayment}
                  >
                    Remove
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="couponCode"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={validatingCoupon || processingPayment}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyCoupon();
                    }
                  }}
                />
                <Button
                  onClick={handleApplyCoupon}
                  disabled={validatingCoupon || !couponCode.trim() || processingPayment}
                  variant="outline"
                >
                  {validatingCoupon ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validating
                    </>
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Price Summary */}
          <div className="space-y-3">
            <h3 className="font-semibold mb-2">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{currency}{originalPrice}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Discount:</span>
                  <span>-{currency}{discount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{currency}{finalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Pay Now Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handlePayNow}
            disabled={processingPayment}
          >
            {processingPayment ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Pay Now - {currency}{finalPrice.toFixed(2)}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You will be redirected to a secure payment gateway to complete your purchase
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
