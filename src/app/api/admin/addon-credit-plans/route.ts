import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAuthToken } from '@/lib/admin-auth';
import {
  getAllAddonCreditPlans,
  createAddonCreditPlan,
  updateAddonCreditPlan,
  deleteAddonCreditPlan,
} from '@/lib/credits';
import type { CreateAddonCreditPlanInput, UpdateAddonCreditPlanInput, AddonCreditType } from '@/types/subscription';

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
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as AddonCreditType | null;
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    const plans = await getAllAddonCreditPlans(
      type || undefined,
      activeOnly
    );
    
    return NextResponse.json(plans);
  } catch (error: any) {
    console.error('Get addon credit plans error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
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
    
    const { valid } = verifyAdminToken(token);
    
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    const input: CreateAddonCreditPlanInput = await request.json();
    
    if (!input.type || !input.name || input.creditAmount === undefined || 
        input.price === undefined || !input.currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const planId = await createAddonCreditPlan(input);
    
    return NextResponse.json({ id: planId, success: true });
  } catch (error: any) {
    console.error('Create addon credit plan error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    
    const { id, ...input }: { id: string } & UpdateAddonCreditPlanInput = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }
    
    await updateAddonCreditPlan(id, input);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update addon credit plan error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');
    
    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }
    
    await deleteAddonCreditPlan(planId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete addon credit plan error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
