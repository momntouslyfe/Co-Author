import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAuthToken } from '@/lib/admin-auth';
import { updateAdminSettings, getAdminSettings } from '@/lib/admin-settings';

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
    
    const currentSettings = await getAdminSettings();
    const currentCacheSettings = currentSettings?.cacheSettings || {
      enabled: false,
      intervalMinutes: 30,
      clearOnAIError: true,
    };
    
    await updateAdminSettings({
      cacheSettings: {
        ...currentCacheSettings,
        lastCleared: new Date().toISOString(),
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      clearedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Clear cache error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
