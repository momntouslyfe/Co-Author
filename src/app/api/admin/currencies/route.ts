import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAuthToken } from '@/lib/admin-auth';
import { getAllCurrencies, initializeDefaultCurrencies } from '@/lib/currency';

export async function GET(request: NextRequest) {
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
    
    await initializeDefaultCurrencies();
    
    const currencies = await getAllCurrencies();
    
    return NextResponse.json({ currencies });
  } catch (error: any) {
    console.error('Get currencies error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
