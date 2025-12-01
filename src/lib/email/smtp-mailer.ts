import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { encrypt, decrypt } from '@/lib/encryption';
import type { 
  EmailSettings,
  EmailProvider,
  EmailSendResult,
  EmailQueueItem,
  EmailTemplateType,
  TrackingEventLog
} from '@/types/integrations';

let cachedTransporter: Transporter | null = null;
let cachedSettingsHash: string | null = null;

function getSettingsHash(settings: EmailSettings): string {
  if (settings.provider === 'smtp' && settings.smtp) {
    return `smtp:${settings.smtp.host}:${settings.smtp.port}:${settings.smtp.username}:${settings.smtp.secure}`;
  }
  if (settings.provider === 'sendgrid') {
    return `sendgrid:${settings.sendgrid?.apiKey?.substring(0, 10)}`;
  }
  if (settings.provider === 'resend') {
    return `resend:${settings.resend?.apiKey?.substring(0, 10)}`;
  }
  return '';
}

export async function getEmailSettings(): Promise<EmailSettings | null> {
  try {
    const admin = getFirebaseAdmin();
    const doc = await admin.firestore().collection('integrationSettings').doc('email').get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data() as any;
    
    const settings: EmailSettings = {
      enabled: data.enabled || false,
      provider: data.provider || 'smtp',
      fromEmail: data.fromEmail || '',
      fromName: data.fromName || '',
      replyToEmail: data.replyToEmail,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };

    if (data.provider === 'smtp' || !data.provider) {
      settings.smtp = {
        host: data.smtp?.host || data.host || '',
        port: data.smtp?.port || data.port || 587,
        secure: data.smtp?.secure ?? data.secure ?? false,
        username: data.smtp?.username || data.username || '',
        password: data.smtp?.encryptedPassword 
          ? decrypt(data.smtp.encryptedPassword) 
          : (data.encryptedPassword ? decrypt(data.encryptedPassword) : ''),
      };
    }

    if (data.provider === 'sendgrid' && data.sendgrid?.encryptedApiKey) {
      settings.sendgrid = {
        apiKey: decrypt(data.sendgrid.encryptedApiKey),
      };
    }

    if (data.provider === 'resend' && data.resend?.encryptedApiKey) {
      settings.resend = {
        apiKey: decrypt(data.resend.encryptedApiKey),
      };
    }
    
    return settings;
  } catch (error) {
    console.error('Error getting email settings:', error);
    return null;
  }
}

export async function getSMTPSettings() {
  const settings = await getEmailSettings();
  if (!settings) return null;
  
  return {
    enabled: settings.enabled,
    host: settings.smtp?.host || '',
    port: settings.smtp?.port || 587,
    secure: settings.smtp?.secure || false,
    username: settings.smtp?.username || '',
    password: settings.smtp?.password || '',
    fromEmail: settings.fromEmail,
    fromName: settings.fromName,
    replyToEmail: settings.replyToEmail,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

export async function saveEmailSettings(settings: Partial<EmailSettings> & { 
  smtp?: { host?: string; port?: number; secure?: boolean; username?: string; password?: string };
  sendgrid?: { apiKey?: string };
  resend?: { apiKey?: string };
}): Promise<void> {
  const admin = getFirebaseAdmin();
  const docRef = admin.firestore().collection('integrationSettings').doc('email');
  
  const dataToSave: Record<string, any> = {
    enabled: settings.enabled ?? false,
    provider: settings.provider || 'smtp',
    fromEmail: settings.fromEmail || '',
    fromName: settings.fromName || '',
    replyToEmail: settings.replyToEmail || '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (settings.provider === 'smtp' && settings.smtp) {
    dataToSave.smtp = {
      host: settings.smtp.host || '',
      port: settings.smtp.port || 587,
      secure: settings.smtp.secure ?? false,
      username: settings.smtp.username || '',
    };
    if (settings.smtp.password && settings.smtp.password !== '********') {
      dataToSave.smtp.encryptedPassword = encrypt(settings.smtp.password);
    }
  }

  if (settings.provider === 'sendgrid' && settings.sendgrid?.apiKey) {
    if (settings.sendgrid.apiKey !== '********') {
      dataToSave.sendgrid = {
        encryptedApiKey: encrypt(settings.sendgrid.apiKey),
      };
    }
  }

  if (settings.provider === 'resend' && settings.resend?.apiKey) {
    if (settings.resend.apiKey !== '********') {
      dataToSave.resend = {
        encryptedApiKey: encrypt(settings.resend.apiKey),
      };
    }
  }
  
  const existingDoc = await docRef.get();
  if (!existingDoc.exists) {
    dataToSave.createdAt = admin.firestore.FieldValue.serverTimestamp();
  } else {
    const existingData = existingDoc.data();
    if (settings.provider === 'smtp' && existingData?.smtp?.encryptedPassword && !settings.smtp?.password) {
      dataToSave.smtp = { ...dataToSave.smtp, encryptedPassword: existingData.smtp.encryptedPassword };
    }
    if (settings.provider === 'sendgrid' && existingData?.sendgrid?.encryptedApiKey && settings.sendgrid?.apiKey === '********') {
      dataToSave.sendgrid = existingData.sendgrid;
    }
    if (settings.provider === 'resend' && existingData?.resend?.encryptedApiKey && settings.resend?.apiKey === '********') {
      dataToSave.resend = existingData.resend;
    }
  }
  
  await docRef.set(dataToSave, { merge: true });
  
  cachedTransporter = null;
  cachedSettingsHash = null;
}

export async function saveSMTPSettings(settings: any): Promise<void> {
  await saveEmailSettings({
    enabled: settings.enabled,
    provider: 'smtp',
    fromEmail: settings.fromEmail,
    fromName: settings.fromName,
    replyToEmail: settings.replyToEmail,
    smtp: {
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      username: settings.username,
      password: settings.password,
    },
  });
}

export async function deleteEmailSettings(): Promise<void> {
  const admin = getFirebaseAdmin();
  await admin.firestore().collection('integrationSettings').doc('email').delete();
  cachedTransporter = null;
  cachedSettingsHash = null;
}

export async function deleteSMTPSettings(): Promise<void> {
  await deleteEmailSettings();
}

async function getSMTPTransporter(settings: EmailSettings): Promise<Transporter | null> {
  if (!settings.smtp?.host || !settings.smtp?.username || !settings.smtp?.password) {
    console.error('SMTP settings incomplete');
    return null;
  }
  
  const currentHash = getSettingsHash(settings);
  
  if (cachedTransporter && cachedSettingsHash === currentHash) {
    return cachedTransporter;
  }
  
  cachedTransporter = nodemailer.createTransport({
    host: settings.smtp.host,
    port: settings.smtp.port,
    secure: settings.smtp.secure,
    auth: {
      user: settings.smtp.username,
      pass: settings.smtp.password,
    },
  });
  
  cachedSettingsHash = currentHash;
  
  return cachedTransporter;
}

async function sendViaSendGrid(params: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  settings: EmailSettings;
}): Promise<EmailSendResult> {
  const { to, toName, subject, html, text, settings } = params;
  
  if (!settings.sendgrid?.apiKey) {
    return { success: false, error: 'SendGrid API key not configured' };
  }

  const toEmail = toName ? { email: to, name: toName } : { email: to };
  const fromEmail = settings.fromName 
    ? { email: settings.fromEmail, name: settings.fromName }
    : { email: settings.fromEmail };

  const payload: any = {
    personalizations: [{ to: [toEmail] }],
    from: fromEmail,
    subject,
    content: [
      ...(text ? [{ type: 'text/plain', value: text }] : []),
      { type: 'text/html', value: html },
    ],
  };

  if (settings.replyToEmail) {
    payload.reply_to = { email: settings.replyToEmail };
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.sendgrid.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.ok || response.status === 202) {
    const messageId = response.headers.get('x-message-id') || `sg-${Date.now()}`;
    return { success: true, messageId };
  }

  const errorText = await response.text();
  let errorMessage = 'SendGrid API error';
  try {
    const errorJson = JSON.parse(errorText);
    errorMessage = errorJson.errors?.[0]?.message || errorMessage;
  } catch {
    errorMessage = errorText || errorMessage;
  }

  return { success: false, error: errorMessage };
}

async function sendViaResend(params: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  settings: EmailSettings;
}): Promise<EmailSendResult> {
  const { to, toName, subject, html, text, settings } = params;
  
  if (!settings.resend?.apiKey) {
    return { success: false, error: 'Resend API key not configured' };
  }

  const toAddress = toName ? `${toName} <${to}>` : to;
  const fromAddress = settings.fromName 
    ? `${settings.fromName} <${settings.fromEmail}>`
    : settings.fromEmail;

  const payload: any = {
    from: fromAddress,
    to: [toAddress],
    subject,
    html,
  };

  if (text) {
    payload.text = text;
  }

  if (settings.replyToEmail) {
    payload.reply_to = settings.replyToEmail;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (response.ok && data.id) {
    return { success: true, messageId: data.id };
  }

  return { success: false, error: data.message || 'Resend API error' };
}

async function logEmailEvent(
  eventName: string,
  status: 'success' | 'failed',
  userId?: string,
  userEmail?: string,
  requestData?: Record<string, any>,
  responseData?: Record<string, any>,
  error?: string
): Promise<void> {
  try {
    const admin = getFirebaseAdmin();
    const logEntry: Omit<TrackingEventLog, 'id'> = {
      type: 'email',
      eventName,
      userId,
      userEmail,
      status,
      requestData,
      responseData,
      error,
      createdAt: new Date().toISOString(),
    };
    
    await admin.firestore().collection('trackingEventLogs').add(logEntry);
  } catch (err) {
    console.error('Failed to log email event:', err);
  }
}

export async function sendEmail(params: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  userId?: string;
  templateType?: EmailTemplateType;
  metadata?: Record<string, any>;
}): Promise<EmailSendResult> {
  try {
    const settings = await getEmailSettings();
    
    if (!settings || !settings.enabled) {
      console.log('Email not enabled, skipping');
      return { success: true };
    }

    let result: EmailSendResult;

    switch (settings.provider) {
      case 'sendgrid':
        result = await sendViaSendGrid({
          to: params.to,
          toName: params.toName,
          subject: params.subject,
          html: params.html,
          text: params.text,
          settings,
        });
        break;

      case 'resend':
        result = await sendViaResend({
          to: params.to,
          toName: params.toName,
          subject: params.subject,
          html: params.html,
          text: params.text,
          settings,
        });
        break;

      case 'smtp':
      default:
        const transporter = await getSMTPTransporter(settings);
        
        if (!transporter) {
          return { success: false, error: 'SMTP transporter not available' };
        }
        
        const mailOptions: nodemailer.SendMailOptions = {
          from: settings.fromName 
            ? `"${settings.fromName}" <${settings.fromEmail}>`
            : settings.fromEmail,
          to: params.toName ? `"${params.toName}" <${params.to}>` : params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
        };
        
        if (settings.replyToEmail) {
          mailOptions.replyTo = settings.replyToEmail;
        }
        
        const smtpResult = await transporter.sendMail(mailOptions);
        result = { success: true, messageId: smtpResult.messageId };
        break;
    }
    
    console.log(`Email sent via ${settings.provider}:`, {
      messageId: result.messageId,
      to: params.to,
      subject: params.subject,
    });
    
    await logEmailEvent(
      params.templateType || 'custom_email',
      result.success ? 'success' : 'failed',
      params.userId,
      params.to,
      { subject: params.subject, templateType: params.templateType, provider: settings.provider },
      { messageId: result.messageId },
      result.error
    );
    
    return result;
  } catch (error: any) {
    console.error('Email send error:', error);
    
    await logEmailEvent(
      params.templateType || 'custom_email',
      'failed',
      params.userId,
      params.to,
      { subject: params.subject, templateType: params.templateType },
      undefined,
      error.message
    );
    
    return { success: false, error: error.message };
  }
}

export async function queueEmail(params: {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateType?: EmailTemplateType;
  templateData?: Record<string, any>;
  userId?: string;
  metadata?: Record<string, any>;
  scheduledAt?: Date;
}): Promise<string> {
  const admin = getFirebaseAdmin();
  
  const queueItem: Omit<EmailQueueItem, 'id'> = {
    to: params.to,
    toName: params.toName,
    subject: params.subject,
    htmlContent: params.htmlContent,
    textContent: params.textContent,
    templateType: params.templateType,
    templateData: params.templateData,
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    userId: params.userId,
    metadata: params.metadata,
    scheduledAt: params.scheduledAt?.toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const docRef = await admin.firestore().collection('emailQueue').add(queueItem);
  
  return docRef.id;
}

export async function processEmailQueue(): Promise<{ processed: number; failed: number }> {
  const admin = getFirebaseAdmin();
  const now = new Date();
  
  const pendingEmails = await admin.firestore()
    .collection('emailQueue')
    .where('status', '==', 'pending')
    .where('attempts', '<', 3)
    .limit(10)
    .get();
  
  let processed = 0;
  let failed = 0;
  
  for (const doc of pendingEmails.docs) {
    const emailData = doc.data() as EmailQueueItem;
    
    if (emailData.scheduledAt && new Date(emailData.scheduledAt) > now) {
      continue;
    }
    
    const result = await sendEmail({
      to: emailData.to,
      toName: emailData.toName,
      subject: emailData.subject,
      html: emailData.htmlContent,
      text: emailData.textContent,
      userId: emailData.userId,
      templateType: emailData.templateType,
      metadata: emailData.metadata,
    });
    
    if (result.success) {
      await doc.ref.update({
        status: 'sent',
        sentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      processed++;
    } else {
      const newAttempts = emailData.attempts + 1;
      await doc.ref.update({
        attempts: newAttempts,
        lastError: result.error,
        status: newAttempts >= emailData.maxAttempts ? 'failed' : 'pending',
        updatedAt: new Date().toISOString(),
      });
      failed++;
    }
  }
  
  return { processed, failed };
}

export async function testEmailConnection(): Promise<{ 
  success: boolean; 
  error?: string;
  provider?: EmailProvider;
}> {
  try {
    const settings = await getEmailSettings();
    
    if (!settings) {
      return { success: false, error: 'Email not configured' };
    }

    switch (settings.provider) {
      case 'sendgrid':
        if (!settings.sendgrid?.apiKey) {
          return { success: false, error: 'SendGrid API key not configured', provider: 'sendgrid' };
        }
        const sgResponse = await fetch('https://api.sendgrid.com/v3/user/credits', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${settings.sendgrid.apiKey}`,
          },
        });
        if (sgResponse.ok || sgResponse.status === 200) {
          return { success: true, provider: 'sendgrid' };
        }
        return { success: false, error: 'Invalid SendGrid API key', provider: 'sendgrid' };

      case 'resend':
        if (!settings.resend?.apiKey) {
          return { success: false, error: 'Resend API key not configured', provider: 'resend' };
        }
        const resendResponse = await fetch('https://api.resend.com/domains', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${settings.resend.apiKey}`,
          },
        });
        if (resendResponse.ok) {
          return { success: true, provider: 'resend' };
        }
        return { success: false, error: 'Invalid Resend API key', provider: 'resend' };

      case 'smtp':
      default:
        if (!settings.smtp?.host || !settings.smtp?.username || !settings.smtp?.password) {
          return { success: false, error: 'SMTP settings incomplete', provider: 'smtp' };
        }
        
        const transporter = nodemailer.createTransport({
          host: settings.smtp.host,
          port: settings.smtp.port,
          secure: settings.smtp.secure,
          auth: {
            user: settings.smtp.username,
            pass: settings.smtp.password,
          },
        });
        
        await transporter.verify();
        
        return { success: true, provider: 'smtp' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function testSMTPConnection(): Promise<{ success: boolean; error?: string }> {
  return testEmailConnection();
}

export async function sendTestEmail(to: string): Promise<EmailSendResult> {
  const settings = await getEmailSettings();
  
  if (!settings) {
    return { success: false, error: 'Email not configured' };
  }

  const providerName = settings.provider === 'sendgrid' ? 'SendGrid' 
    : settings.provider === 'resend' ? 'Resend' 
    : 'SMTP';
  
  return sendEmail({
    to,
    subject: 'Co-Author Email Test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Email Configuration Test</h1>
        <p>This is a test email from Co-Author.</p>
        <p>If you received this email, your <strong>${providerName}</strong> configuration is working correctly!</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">
          Sent from ${settings.fromName || 'Co-Author'} (${settings.fromEmail}) via ${providerName}
        </p>
      </div>
    `,
    text: `This is a test email from Co-Author. If you received this email, your ${providerName} configuration is working correctly!`,
  });
}
