import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAuthToken } from '@/lib/admin-auth';
import { 
  getSMTPSettings, 
  saveSMTPSettings, 
  deleteSMTPSettings 
} from '@/lib/email/smtp-mailer';

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
    
    const settings = await getSMTPSettings();
    
    if (!settings) {
      return NextResponse.json({
        enabled: false,
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: '',
        fromEmail: '',
        fromName: '',
        replyToEmail: '',
      });
    }
    
    return NextResponse.json({
      ...settings,
      password: settings.password ? '********' : '',
    });
  } catch (error: any) {
    console.error('Get SMTP settings error:', error);
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
    const { enabled, host, port, secure, username, password, fromEmail, fromName, replyToEmail } = body;
    
    if (enabled && (!host || !username || !fromEmail)) {
      return NextResponse.json(
        { error: 'Host, username, and from email are required when enabled' },
        { status: 400 }
      );
    }
    
    const settingsToSave: Record<string, any> = {
      enabled: enabled ?? false,
      host: host || '',
      port: port || 587,
      secure: secure ?? false,
      username: username || '',
      fromEmail: fromEmail || '',
      fromName: fromName || '',
      replyToEmail: replyToEmail || '',
    };
    
    if (password && password !== '********') {
      settingsToSave.password = password;
    }
    
    await saveSMTPSettings(settingsToSave);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save SMTP settings error:', error);
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
    
    await deleteSMTPSettings();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete SMTP settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
