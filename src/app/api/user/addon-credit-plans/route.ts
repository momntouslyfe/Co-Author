import { NextRequest, NextResponse } from 'next/server';
import { getAllAddonCreditPlans } from '@/lib/credits';
import type { AddonCreditType } from '@/types/subscription';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as AddonCreditType | null;
    
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
