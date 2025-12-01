export interface FacebookPixelSettings {
  enabled: boolean;
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
  enabledEvents: FacebookEventType[];
  createdAt: string;
  updatedAt: string;
}

export type FacebookEventType = 
  | 'PageView'
  | 'ViewContent'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'CompleteRegistration'
  | 'Lead'
  | 'AddToCart'
  | 'AddPaymentInfo'
  | 'Subscribe'
  | 'StartTrial'
  | 'Contact';

export interface FacebookEventData {
  event_name: FacebookEventType;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source: 'website' | 'email' | 'app' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
  user_data: FacebookUserData;
  custom_data?: FacebookCustomData;
  opt_out?: boolean;
}

export interface FacebookUserData {
  em?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  ct?: string[];
  st?: string[];
  zp?: string[];
  country?: string[];
  external_id?: string[];
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;
  fbp?: string;
}

export interface FacebookCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  order_id?: string;
  predicted_ltv?: number;
  num_items?: number;
  status?: string;
  subscription_id?: string;
}

export interface FacebookAPIResponse {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export type EmailProvider = 'smtp' | 'sendgrid' | 'resend';

export interface EmailSettings {
  enabled: boolean;
  provider: EmailProvider;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  sendgrid?: {
    apiKey: string;
  };
  resend?: {
    apiKey: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SMTPSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export type EmailTemplateType = 
  | 'welcome'
  | 'purchase_confirmation'
  | 'subscription_activated'
  | 'subscription_renewed'
  | 'subscription_expiring'
  | 'credits_added'
  | 'credits_low'
  | 'password_reset'
  | 'promotional'
  | 'book_completed'
  | 'chapter_ready';

export interface EmailTemplate {
  id: string;
  type: EmailTemplateType;
  subject: string;
  htmlContent: string;
  textContent?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailQueueItem {
  id: string;
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateType?: EmailTemplateType;
  templateData?: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  userId?: string;
  metadata?: Record<string, any>;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TrackingEventLog {
  id: string;
  type: 'facebook' | 'email';
  eventName: string;
  userId?: string;
  userEmail?: string;
  status: 'success' | 'failed';
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  error?: string;
  createdAt: string;
}
