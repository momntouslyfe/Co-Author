import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAuthToken } from '@/lib/admin-auth';
import { 
  getFacebookPixelSettings, 
  saveFacebookPixelSettings, 
  deleteFacebookPixelSettings,
  testFacebookConnection 
} from '@/lib/integrations/facebook-capi';
import type { FacebookEventType } from '@/types/integrations';

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
    
    const settings = await getFacebookPixelSettings();
    
    if (!settings) {
      return NextResponse.json({
        enabled: false,
        pixelId: '',
        accessToken: '',
        testEventCode: '',
        enabledEvents: ['PageView', 'ViewContent', 'InitiateCheckout', 'Purchase', 'CompleteRegistration', 'Lead', 'Subscribe'] as FacebookEventType[],
      });
    }
    
    return NextResponse.json({
      ...settings,
      accessToken: settings.accessToken ? '***' + settings.accessToken.slice(-8) : '',
    });
  } catch (error: any) {
    console.error('Get Facebook settings error:', error);
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
    
    const body = await request.json();
    const { enabled, pixelId, accessToken, testEventCode, enabledEvents } = body;
    
    if (enabled && (!pixelId || !accessToken)) {
      return NextResponse.json(
        { error: 'Pixel ID and Access Token are required when enabled' },
        { status: 400 }
      );
    }
    
    const settingsToSave: Record<string, any> = {
      enabled: enabled ?? false,
      pixelId: pixelId || '',
      testEventCode: testEventCode || '',
      enabledEvents: enabledEvents || ['PageView', 'ViewContent', 'InitiateCheckout', 'Purchase', 'CompleteRegistration', 'Lead', 'Subscribe'],
    };
    
    if (accessToken && !accessToken.startsWith('***')) {
      settingsToSave.accessToken = accessToken;
    }
    
    await saveFacebookPixelSettings(settingsToSave);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save Facebook settings error:', error);
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
    
    await deleteFacebookPixelSettings();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Facebook settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
