import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { refundBookCreationCredit } from '@/lib/credit-tracker';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId, projectTitle } = await request.json();
    
    if (!projectId || !projectTitle) {
      return NextResponse.json(
        { error: 'Project ID and title are required' },
        { status: 400 }
      );
    }
    
    await refundBookCreationCredit(userId, projectId, projectTitle);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Refund book credit error:', error);
    
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
