import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { addCredits } from '@/lib/credits';
import type { AllocateCreditsInput } from '@/types/subscription';

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { valid, email } = verifyAdminToken(token);
    
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    const input: AllocateCreditsInput = await request.json();
    
    if (!input.userId || !input.creditType || input.amount === undefined || !input.description) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, creditType, amount, description' },
        { status: 400 }
      );
    }
    
    if (input.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }
    
    await addCredits(
      input.userId,
      input.creditType,
      input.amount,
      'admin_allocation',
      input.description,
      { allocatedBy: email || 'admin' }
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Allocate credits error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
