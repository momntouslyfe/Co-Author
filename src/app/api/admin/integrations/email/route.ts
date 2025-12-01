import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAuthToken } from '@/lib/admin-auth';
import { 
  getEmailSettings, 
  saveEmailSettings, 
  deleteEmailSettings 
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
    
    const settings = await getEmailSettings();
    
    if (!settings) {
      return NextResponse.json({
        enabled: false,
        provider: 'smtp',
        fromEmail: '',
        fromName: '',
        replyToEmail: '',
        smtp: {
          host: '',
          port: 587,
          secure: false,
          username: '',
          password: '',
        },
        sendgrid: {
          apiKey: '',
        },
        resend: {
          apiKey: '',
        },
      });
    }
    
    const response: any = {
      enabled: settings.enabled,
      provider: settings.provider,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      replyToEmail: settings.replyToEmail || '',
      smtp: {
        host: settings.smtp?.host || '',
        port: settings.smtp?.port || 587,
        secure: settings.smtp?.secure || false,
        username: settings.smtp?.username || '',
        password: settings.smtp?.password ? '********' : '',
      },
      sendgrid: {
        apiKey: settings.sendgrid?.apiKey ? '********' : '',
      },
      resend: {
        apiKey: settings.resend?.apiKey ? '********' : '',
      },
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Get email settings error:', error);
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
    const { enabled, provider, fromEmail, fromName, replyToEmail, smtp, sendgrid, resend } = body;
    
    if (enabled && !fromEmail) {
      return NextResponse.json(
        { error: 'From email is required when enabled' },
        { status: 400 }
      );
    }

    if (enabled && provider === 'smtp' && (!smtp?.host || !smtp?.username)) {
      return NextResponse.json(
        { error: 'SMTP host and username are required' },
        { status: 400 }
      );
    }

    if (enabled && provider === 'sendgrid' && !sendgrid?.apiKey) {
      return NextResponse.json(
        { error: 'SendGrid API key is required' },
        { status: 400 }
      );
    }

    if (enabled && provider === 'resend' && !resend?.apiKey) {
      return NextResponse.json(
        { error: 'Resend API key is required' },
        { status: 400 }
      );
    }
    
    await saveEmailSettings({
      enabled: enabled ?? false,
      provider: provider || 'smtp',
      fromEmail: fromEmail || '',
      fromName: fromName || '',
      replyToEmail: replyToEmail || '',
      smtp: provider === 'smtp' ? {
        host: smtp?.host || '',
        port: smtp?.port || 587,
        secure: smtp?.secure ?? false,
        username: smtp?.username || '',
        password: smtp?.password,
      } : undefined,
      sendgrid: provider === 'sendgrid' ? {
        apiKey: sendgrid?.apiKey,
      } : undefined,
      resend: provider === 'resend' ? {
        apiKey: resend?.apiKey,
      } : undefined,
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save email settings error:', error);
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
    
    await deleteEmailSettings();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete email settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
