import { NextRequest, NextResponse } from 'next/server';
import { getAllAddonCreditPlans, getUserSubscription, getSubscriptionPlan, getUserCreditSummary } from '@/lib/credits';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import type { AddonCreditType } from '@/types/subscription';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as AddonCreditType | null;
    
    if (type === 'offers') {
      try {
        const userId = await getAuthenticatedUserId();
        const [userSub, creditSummary] = await Promise.all([
          getUserSubscription(userId),
          getUserCreditSummary(userId)
        ]);
        
        let hasAccess = false;
        
        if ((creditSummary?.offerCreditsAvailable ?? 0) > 0) {
          hasAccess = true;
        }
        
        if (!hasAccess && userSub?.subscriptionPlanId) {
          const plan = await getSubscriptionPlan(userSub.subscriptionPlanId);
          if (plan?.enableCoMarketer) {
            hasAccess = true;
          }
        }
        
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'Your subscription plan does not include Co-Marketer access. Please upgrade your plan to purchase offer credits.' },
            { status: 403 }
          );
        }
      } catch (authError) {
        return NextResponse.json(
          { error: 'Authentication required to view offer credit plans.' },
          { status: 401 }
        );
      }
    }
    
    const plans = await getAllAddonCreditPlans(
      type || undefined,
      true
    );
    
    return NextResponse.json(plans);
  } catch (error: any) {
    console.error('Get addon credit plans error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
