import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAuthToken } from '@/lib/admin-auth';
import { testFacebookConnection, sendFacebookEvent } from '@/lib/integrations/facebook-capi';

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { valid } = verifyAdminToken(token);
    
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { action } = body;
    
    if (action === 'test_connection') {
      const result = await testFacebookConnection();
      return NextResponse.json(result);
    }
    
    if (action === 'send_test_event') {
      const result = await sendFacebookEvent('PageView', {
        email: 'test@example.com',
        eventSourceUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://co-author.com',
      });
      return NextResponse.json(result);
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Facebook test error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
