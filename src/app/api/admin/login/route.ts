import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials, generateAdminToken } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const result = verifyAdminCredentials(email, password);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    const token = generateAdminToken(email);
    
    return NextResponse.json({
      success: true,
      token,
      email,
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
