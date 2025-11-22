import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAuthToken } from '@/lib/admin-auth';
import { 
  getAdminAPIKeys, 
  saveAdminAPIKey, 
  deleteAdminAPIKey,
  toggleAdminAPIKey 
} from '@/lib/admin-settings';
import type { AIProvider } from '@/lib/definitions';

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
    
    const apiKeys = await getAdminAPIKeys();
    
    const sanitizedKeys = apiKeys.map(key => ({
      ...key,
      apiKey: key.apiKey ? '***' + key.apiKey.slice(-4) : '',
    }));
    
    return NextResponse.json(sanitizedKeys);
  } catch (error: any) {
    console.error('Get admin API keys error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    
    const { provider, apiKey, model } = await request.json();
    
    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 }
      );
    }
    
    await saveAdminAPIKey(provider as AIProvider, apiKey, model);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save admin API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    const keyId = searchParams.get('id');
    
    if (!keyId) {
      return NextResponse.json(
        { error: 'Key ID is required' },
        { status: 400 }
      );
    }
    
    await deleteAdminAPIKey(keyId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete admin API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    
    const { keyId, isActive } = await request.json();
    
    if (!keyId || isActive === undefined) {
      return NextResponse.json(
        { error: 'Key ID and isActive status are required' },
        { status: 400 }
      );
    }
    
    await toggleAdminAPIKey(keyId, isActive);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Toggle admin API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
