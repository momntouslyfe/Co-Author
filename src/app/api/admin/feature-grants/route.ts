import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAuthToken } from '@/lib/admin-auth';
import {
  getAllFeatureGrants,
  getUserFeatureGrants,
  createFeatureGrant,
  revokeFeatureGrant,
} from '@/lib/trial-grants';
import type { FeatureGrantType } from '@/types/subscription';

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request);
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid } = verifyAdminToken(token);
    
    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (userId) {
      const grants = await getUserFeatureGrants(userId);
      return NextResponse.json({ grants, total: grants.length });
    }
    
    const result = await getAllFeatureGrants(limit, offset);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Get feature grants error:', error);
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, email } = verifyAdminToken(token);
    
    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    const body = await request.json();
    const { userId, feature, durationDays, expiresAt, notes } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    if (!feature || !['coMarketer', 'coWriter'].includes(feature)) {
      return NextResponse.json(
        { error: 'Valid feature type is required (coMarketer or coWriter)' },
        { status: 400 }
      );
    }
    
    if (!durationDays && !expiresAt) {
      return NextResponse.json(
        { error: 'Either durationDays or expiresAt is required' },
        { status: 400 }
      );
    }
    
    const grantId = await createFeatureGrant(
      {
        userId,
        feature: feature as FeatureGrantType,
        durationDays,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        notes,
      },
      email || 'admin'
    );
    
    return NextResponse.json({ success: true, grantId });
  } catch (error: any) {
    console.error('Create feature grant error:', error);
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid } = verifyAdminToken(token);
    
    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const grantId = searchParams.get('grantId');
    
    if (!grantId) {
      return NextResponse.json({ error: 'Grant ID is required' }, { status: 400 });
    }
    
    await revokeFeatureGrant(grantId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete feature grant error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
