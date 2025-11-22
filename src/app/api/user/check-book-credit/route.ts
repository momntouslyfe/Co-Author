import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { checkBookCreationCredit } from '@/lib/credit-tracker';

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    await checkBookCreationCredit(userId);
    
    return NextResponse.json({ sufficient: true });
  } catch (error: any) {
    console.error('Check book credit error:', error);
    
    if (error.message.includes('Insufficient')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
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
