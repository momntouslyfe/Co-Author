import { NextRequest, NextResponse } from 'next/server';
import { getAllSubscriptionPlans } from '@/lib/credits';

export async function GET(request: NextRequest) {
  try {
    const plans = await getAllSubscriptionPlans(true);
    
    return NextResponse.json(plans);
  } catch (error: any) {
    console.error('Get subscription plans error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
