import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { getUserCreditSummary } from '@/lib/credits';

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    const creditSummary = await getUserCreditSummary(userId);
    
    const hasCredits = creditSummary.bookCreditsAvailable >= 1;
    
    return NextResponse.json({ 
      hasCredits,
      bookCreditsAvailable: creditSummary.bookCreditsAvailable,
      message: hasCredits 
        ? `You have ${creditSummary.bookCreditsAvailable} book credits available.`
        : `Insufficient book creation credits. You have ${creditSummary.bookCreditsAvailable} credits remaining. Please purchase more credits or upgrade your plan to continue.`
    });
  } catch (error: any) {
    console.error('Check book credit error:', error);
    
    if (error.message.includes('Not authenticated')) {
      return NextResponse.json(
        { error: 'Unauthorized', hasCredits: false },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error', hasCredits: false },
      { status: 500 }
    );
  }
}
