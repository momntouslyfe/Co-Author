import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { checkOfferCreationCredit } from '@/lib/credit-tracker';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    
    await checkOfferCreationCredit(userId);
    
    return NextResponse.json({ hasCredits: true });
  } catch (error: any) {
    console.error('Check offer credit error:', error);
    
    if (error.message.includes('Not authenticated')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (error.message.includes('Insufficient offer creation credits') || 
        error.message.includes('subscription')) {
      return NextResponse.json(
        { hasCredits: false, error: error.message },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
