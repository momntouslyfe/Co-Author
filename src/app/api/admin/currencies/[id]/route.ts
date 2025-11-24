import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAuthToken } from '@/lib/admin-auth';
import { updateCurrency } from '@/lib/currency';
import type { UpdateCurrencySettingsInput } from '@/types/subscription';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
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
    
    const { id } = await context.params;
    const input: UpdateCurrencySettingsInput = await request.json();
    
    await updateCurrency(id, input);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update currency error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
