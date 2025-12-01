import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAuthToken } from '@/lib/admin-auth';
import { testEmailConnection, sendTestEmail } from '@/lib/email/smtp-mailer';

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
    const { action, email } = body;
    
    if (action === 'test_connection') {
      const result = await testEmailConnection();
      return NextResponse.json(result);
    }
    
    if (action === 'send_test_email') {
      if (!email) {
        return NextResponse.json(
          { error: 'Email address is required' },
          { status: 400 }
        );
      }
      
      const result = await sendTestEmail(email);
      return NextResponse.json(result);
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('SMTP test error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
