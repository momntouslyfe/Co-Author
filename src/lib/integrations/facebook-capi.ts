import crypto from 'crypto';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { encrypt, decrypt } from '@/lib/encryption';
import type { 
  FacebookPixelSettings, 
  FacebookEventData, 
  FacebookEventType,
  FacebookUserData,
  FacebookCustomData,
  FacebookAPIResponse,
  TrackingEventLog
} from '@/types/integrations';

const FACEBOOK_API_VERSION = 'v21.0';
const FACEBOOK_API_BASE = 'https://graph.facebook.com';

function hashData(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function getFacebookPixelSettings(): Promise<FacebookPixelSettings | null> {
  try {
    const admin = getFirebaseAdmin();
    const doc = await admin.firestore().collection('integrationSettings').doc('facebook').get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data() as any;
    
    return {
      ...data,
      accessToken: data.encryptedAccessToken ? decrypt(data.encryptedAccessToken) : '',
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting Facebook Pixel settings:', error);
    return null;
  }
}

export async function saveFacebookPixelSettings(settings: Partial<FacebookPixelSettings>): Promise<void> {
  const admin = getFirebaseAdmin();
  const docRef = admin.firestore().collection('integrationSettings').doc('facebook');
  
  const dataToSave: Record<string, any> = {
    ...settings,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  if (settings.accessToken) {
    dataToSave.encryptedAccessToken = encrypt(settings.accessToken);
    delete dataToSave.accessToken;
  }
  
  const existingDoc = await docRef.get();
  if (!existingDoc.exists) {
    dataToSave.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }
  
  await docRef.set(dataToSave, { merge: true });
}

export async function deleteFacebookPixelSettings(): Promise<void> {
  const admin = getFirebaseAdmin();
  await admin.firestore().collection('integrationSettings').doc('facebook').delete();
}

function buildUserData(params: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  userId?: string;
  clientIp?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
}): FacebookUserData {
  const userData: FacebookUserData = {};
  
  if (params.email) {
    userData.em = [hashData(normalizeEmail(params.email))];
  }
  
  if (params.phone) {
    userData.ph = [hashData(normalizePhone(params.phone))];
  }
  
  if (params.firstName) {
    userData.fn = [hashData(params.firstName)];
  }
  
  if (params.lastName) {
    userData.ln = [hashData(params.lastName)];
  }
  
  if (params.city) {
    userData.ct = [hashData(params.city)];
  }
  
  if (params.state) {
    userData.st = [hashData(params.state)];
  }
  
  if (params.zipCode) {
    userData.zp = [hashData(params.zipCode)];
  }
  
  if (params.country) {
    userData.country = [hashData(params.country)];
  }
  
  if (params.userId) {
    userData.external_id = [hashData(params.userId)];
  }
  
  if (params.clientIp) {
    userData.client_ip_address = params.clientIp;
  }
  
  if (params.userAgent) {
    userData.client_user_agent = params.userAgent;
  }
  
  if (params.fbc) {
    userData.fbc = params.fbc;
  }
  
  if (params.fbp) {
    userData.fbp = params.fbp;
  }
  
  return userData;
}

function generateEventId(): string {
  return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

async function logTrackingEvent(
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
      type: 'facebook',
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
    console.error('Failed to log tracking event:', err);
  }
}

export async function sendFacebookEvent(
  eventName: FacebookEventType,
  params: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    userId?: string;
    clientIp?: string;
    userAgent?: string;
    fbc?: string;
    fbp?: string;
    eventSourceUrl?: string;
    value?: number;
    currency?: string;
    contentName?: string;
    contentCategory?: string;
    contentIds?: string[];
    orderId?: string;
    numItems?: number;
    status?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getFacebookPixelSettings();
    
    if (!settings || !settings.enabled) {
      console.log('Facebook Pixel not enabled, skipping event:', eventName);
      return { success: true };
    }
    
    if (!settings.pixelId || !settings.accessToken) {
      console.error('Facebook Pixel ID or Access Token not configured');
      return { success: false, error: 'Facebook Pixel not configured' };
    }
    
    if (settings.enabledEvents && !settings.enabledEvents.includes(eventName)) {
      console.log('Event not enabled:', eventName);
      return { success: true };
    }
    
    const eventId = generateEventId();
    const userData = buildUserData(params);
    
    const customData: FacebookCustomData = {};
    if (params.value !== undefined) customData.value = params.value;
    if (params.currency) customData.currency = params.currency;
    if (params.contentName) customData.content_name = params.contentName;
    if (params.contentCategory) customData.content_category = params.contentCategory;
    if (params.contentIds) customData.content_ids = params.contentIds;
    if (params.orderId) customData.order_id = params.orderId;
    if (params.numItems !== undefined) customData.num_items = params.numItems;
    if (params.status) customData.status = params.status;
    
    const eventData: FacebookEventData = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: params.eventSourceUrl,
      action_source: 'website',
      user_data: userData,
      custom_data: Object.keys(customData).length > 0 ? customData : undefined,
    };
    
    const apiUrl = `${FACEBOOK_API_BASE}/${FACEBOOK_API_VERSION}/${settings.pixelId}/events`;
    
    const requestBody: Record<string, any> = {
      data: [eventData],
      access_token: settings.accessToken,
    };
    
    if (settings.testEventCode) {
      requestBody.test_event_code = settings.testEventCode;
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const responseData: FacebookAPIResponse = await response.json();
    
    if (responseData.error) {
      console.error('Facebook CAPI error:', responseData.error);
      await logTrackingEvent(
        eventName,
        'failed',
        params.userId,
        params.email,
        { eventData },
        responseData,
        responseData.error.message
      );
      return { success: false, error: responseData.error.message };
    }
    
    console.log(`Facebook CAPI event sent successfully: ${eventName}`, {
      events_received: responseData.events_received,
      fbtrace_id: responseData.fbtrace_id,
    });
    
    await logTrackingEvent(
      eventName,
      'success',
      params.userId,
      params.email,
      { eventData },
      responseData
    );
    
    return { success: true };
  } catch (error: any) {
    console.error('Facebook CAPI error:', error);
    await logTrackingEvent(
      eventName,
      'failed',
      params.userId,
      params.email,
      undefined,
      undefined,
      error.message
    );
    return { success: false, error: error.message };
  }
}

export async function trackPageView(params: {
  userId?: string;
  email?: string;
  clientIp?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  eventSourceUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendFacebookEvent('PageView', params);
}

export async function trackViewContent(params: {
  userId?: string;
  email?: string;
  clientIp?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  eventSourceUrl?: string;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  value?: number;
  currency?: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendFacebookEvent('ViewContent', params);
}

export async function trackInitiateCheckout(params: {
  userId?: string;
  email?: string;
  clientIp?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  eventSourceUrl?: string;
  value?: number;
  currency?: string;
  contentName?: string;
  contentIds?: string[];
  numItems?: number;
}): Promise<{ success: boolean; error?: string }> {
  return sendFacebookEvent('InitiateCheckout', params);
}

export async function trackPurchase(params: {
  userId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  clientIp?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  eventSourceUrl?: string;
  value: number;
  currency: string;
  contentName?: string;
  contentIds?: string[];
  orderId?: string;
  numItems?: number;
}): Promise<{ success: boolean; error?: string }> {
  return sendFacebookEvent('Purchase', params);
}

export async function trackCompleteRegistration(params: {
  userId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  clientIp?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  eventSourceUrl?: string;
  status?: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendFacebookEvent('CompleteRegistration', { ...params, status: params.status || 'completed' });
}

export async function trackLead(params: {
  userId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  clientIp?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  eventSourceUrl?: string;
  value?: number;
  currency?: string;
  contentName?: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendFacebookEvent('Lead', params);
}

export async function trackSubscribe(params: {
  userId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  clientIp?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  eventSourceUrl?: string;
  value?: number;
  currency?: string;
  contentName?: string;
  orderId?: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendFacebookEvent('Subscribe', params);
}

export async function trackStartTrial(params: {
  userId?: string;
  email?: string;
  clientIp?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  eventSourceUrl?: string;
  value?: number;
  currency?: string;
  contentName?: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendFacebookEvent('StartTrial', params);
}

export async function trackAddPaymentInfo(params: {
  userId?: string;
  email?: string;
  clientIp?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
  eventSourceUrl?: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
}): Promise<{ success: boolean; error?: string }> {
  return sendFacebookEvent('AddPaymentInfo', params);
}

export async function testFacebookConnection(): Promise<{ 
  success: boolean; 
  error?: string; 
  pixelId?: string;
}> {
  try {
    const settings = await getFacebookPixelSettings();
    
    if (!settings) {
      return { success: false, error: 'Facebook Pixel not configured' };
    }
    
    if (!settings.pixelId || !settings.accessToken) {
      return { success: false, error: 'Pixel ID or Access Token missing' };
    }
    
    const testUrl = `${FACEBOOK_API_BASE}/${FACEBOOK_API_VERSION}/${settings.pixelId}?fields=name,id&access_token=${settings.accessToken}`;
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    if (data.error) {
      return { success: false, error: data.error.message };
    }
    
    return { success: true, pixelId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
