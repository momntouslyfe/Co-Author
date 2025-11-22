import { NextResponse } from 'next/server';
import { getUserCreditSummary } from '@/lib/credits';
import { getAuthenticatedUserId } from '@/lib/server-auth';

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    const creditSummary = await getUserCreditSummary(userId);
    
    return NextResponse.json(creditSummary);
  } catch (error: any) {
    console.error('Get credit summary error:', error);
    
    if (error.message.includes('Not authenticated')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
