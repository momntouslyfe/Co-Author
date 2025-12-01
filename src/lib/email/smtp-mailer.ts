import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { encrypt, decrypt } from '@/lib/encryption';
import type { 
  SMTPSettings, 
  EmailSendResult, 
  EmailQueueItem,
  EmailTemplateType,
  TrackingEventLog
} from '@/types/integrations';

let cachedTransporter: Transporter | null = null;
let cachedSettingsHash: string | null = null;

function getSettingsHash(settings: SMTPSettings): string {
  return `${settings.host}:${settings.port}:${settings.username}:${settings.secure}`;
}

export async function getSMTPSettings(): Promise<SMTPSettings | null> {
  try {
    const admin = getFirebaseAdmin();
    const doc = await admin.firestore().collection('integrationSettings').doc('smtp').get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data() as any;
    
    return {
      enabled: data.enabled || false,
      host: data.host || '',
      port: data.port || 587,
      secure: data.secure || false,
      username: data.username || '',
      password: data.encryptedPassword ? decrypt(data.encryptedPassword) : '',
      fromEmail: data.fromEmail || '',
      fromName: data.fromName || '',
      replyToEmail: data.replyToEmail,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting SMTP settings:', error);
    return null;
  }
}

export async function saveSMTPSettings(settings: Partial<SMTPSettings>): Promise<void> {
  const admin = getFirebaseAdmin();
  const docRef = admin.firestore().collection('integrationSettings').doc('smtp');
  
  const dataToSave: Record<string, any> = {
    ...settings,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  if (settings.password) {
    dataToSave.encryptedPassword = encrypt(settings.password);
    delete dataToSave.password;
  }
  
  const existingDoc = await docRef.get();
  if (!existingDoc.exists) {
    dataToSave.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }
  
  await docRef.set(dataToSave, { merge: true });
  
  cachedTransporter = null;
  cachedSettingsHash = null;
}

export async function deleteSMTPSettings(): Promise<void> {
  const admin = getFirebaseAdmin();
  await admin.firestore().collection('integrationSettings').doc('smtp').delete();
  cachedTransporter = null;
  cachedSettingsHash = null;
}

async function getTransporter(): Promise<Transporter | null> {
  const settings = await getSMTPSettings();
  
  if (!settings || !settings.enabled) {
    return null;
  }
  
  if (!settings.host || !settings.username || !settings.password) {
    console.error('SMTP settings incomplete');
    return null;
  }
  
  const currentHash = getSettingsHash(settings);
  
  if (cachedTransporter && cachedSettingsHash === currentHash) {
    return cachedTransporter;
  }
  
  cachedTransporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: {
      user: settings.username,
      pass: settings.password,
    },
  });
  
  cachedSettingsHash = currentHash;
  
  return cachedTransporter;
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
    const settings = await getSMTPSettings();
    
    if (!settings || !settings.enabled) {
      console.log('SMTP not enabled, skipping email');
      return { success: true };
    }
    
    const transporter = await getTransporter();
    
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
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', {
      messageId: result.messageId,
      to: params.to,
      subject: params.subject,
    });
    
    await logEmailEvent(
      params.templateType || 'custom_email',
      'success',
      params.userId,
      params.to,
      { subject: params.subject, templateType: params.templateType },
      { messageId: result.messageId }
    );
    
    return { success: true, messageId: result.messageId };
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

export async function testSMTPConnection(): Promise<{ 
  success: boolean; 
  error?: string;
}> {
  try {
    const settings = await getSMTPSettings();
    
    if (!settings) {
      return { success: false, error: 'SMTP not configured' };
    }
    
    if (!settings.host || !settings.username || !settings.password) {
      return { success: false, error: 'SMTP settings incomplete' };
    }
    
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.username,
        pass: settings.password,
      },
    });
    
    await transporter.verify();
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendTestEmail(to: string): Promise<EmailSendResult> {
  const settings = await getSMTPSettings();
  
  if (!settings) {
    return { success: false, error: 'SMTP not configured' };
  }
  
  return sendEmail({
    to,
    subject: 'Co-Author Email Test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Email Configuration Test</h1>
        <p>This is a test email from Co-Author.</p>
        <p>If you received this email, your SMTP configuration is working correctly!</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">
          Sent from ${settings.fromName || 'Co-Author'} (${settings.fromEmail})
        </p>
      </div>
    `,
    text: 'This is a test email from Co-Author. If you received this email, your SMTP configuration is working correctly!',
  });
}
