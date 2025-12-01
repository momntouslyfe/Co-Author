import { sendEmail } from './smtp-mailer';
import { 
  getWelcomeEmailTemplate,
  getPurchaseConfirmationTemplate,
  getSubscriptionActivatedTemplate,
  getCreditsAddedTemplate,
  getCreditsLowTemplate,
  getPromotionalTemplate,
  getBookCompletedTemplate
} from './templates';

interface UserInfo {
  userId: string;
  email: string;
  displayName?: string;
}

export async function sendWelcomeEmail(user: UserInfo): Promise<void> {
  try {
    const template = getWelcomeEmailTemplate({
      userName: user.displayName || user.email.split('@')[0],
      userEmail: user.email,
    });
    
    await sendEmail({
      to: user.email,
      toName: user.displayName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      userId: user.userId,
      templateType: 'welcome',
    });
    
    console.log('Welcome email sent to:', user.email);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

export async function sendPurchaseConfirmationEmail(params: {
  user: UserInfo;
  orderId: string;
  planName: string;
  planPrice: number;
  currency: string;
  creditsAmount?: number;
  creditType?: string;
}): Promise<void> {
  try {
    const template = getPurchaseConfirmationTemplate({
      userName: params.user.displayName || params.user.email.split('@')[0],
      userEmail: params.user.email,
      orderId: params.orderId,
      planName: params.planName,
      planPrice: params.planPrice,
      currency: params.currency,
      creditsAmount: params.creditsAmount,
      creditType: params.creditType,
    });
    
    await sendEmail({
      to: params.user.email,
      toName: params.user.displayName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      userId: params.user.userId,
      templateType: 'purchase_confirmation',
      metadata: { orderId: params.orderId },
    });
    
    console.log('Purchase confirmation email sent to:', params.user.email);
  } catch (error) {
    console.error('Failed to send purchase confirmation email:', error);
  }
}

export async function sendSubscriptionActivatedEmail(params: {
  user: UserInfo;
  planName: string;
  creditsAmount?: number;
  creditType?: string;
  renewalDate?: string;
}): Promise<void> {
  try {
    const template = getSubscriptionActivatedTemplate({
      userName: params.user.displayName || params.user.email.split('@')[0],
      userEmail: params.user.email,
      planName: params.planName,
      creditsAmount: params.creditsAmount,
      creditType: params.creditType,
      renewalDate: params.renewalDate,
    });
    
    await sendEmail({
      to: params.user.email,
      toName: params.user.displayName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      userId: params.user.userId,
      templateType: 'subscription_activated',
    });
    
    console.log('Subscription activated email sent to:', params.user.email);
  } catch (error) {
    console.error('Failed to send subscription activated email:', error);
  }
}

export async function sendCreditsAddedEmail(params: {
  user: UserInfo;
  creditsAmount: number;
  creditType: string;
}): Promise<void> {
  try {
    const template = getCreditsAddedTemplate({
      userName: params.user.displayName || params.user.email.split('@')[0],
      userEmail: params.user.email,
      creditsAmount: params.creditsAmount,
      creditType: params.creditType,
    });
    
    await sendEmail({
      to: params.user.email,
      toName: params.user.displayName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      userId: params.user.userId,
      templateType: 'credits_added',
    });
    
    console.log('Credits added email sent to:', params.user.email);
  } catch (error) {
    console.error('Failed to send credits added email:', error);
  }
}

export async function sendCreditsLowEmail(params: {
  user: UserInfo;
  remainingCredits: number;
  creditType: string;
}): Promise<void> {
  try {
    const template = getCreditsLowTemplate({
      userName: params.user.displayName || params.user.email.split('@')[0],
      userEmail: params.user.email,
      remainingCredits: params.remainingCredits,
      creditType: params.creditType,
    });
    
    await sendEmail({
      to: params.user.email,
      toName: params.user.displayName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      userId: params.user.userId,
      templateType: 'credits_low',
    });
    
    console.log('Credits low email sent to:', params.user.email);
  } catch (error) {
    console.error('Failed to send credits low email:', error);
  }
}

export async function sendPromotionalEmail(params: {
  user: UserInfo;
  promotionTitle: string;
  promotionDescription: string;
  promotionCode?: string;
  promotionDiscount?: string;
  promotionExpiry?: string;
}): Promise<void> {
  try {
    const template = getPromotionalTemplate({
      userName: params.user.displayName || params.user.email.split('@')[0],
      userEmail: params.user.email,
      promotionTitle: params.promotionTitle,
      promotionDescription: params.promotionDescription,
      promotionCode: params.promotionCode,
      promotionDiscount: params.promotionDiscount,
      promotionExpiry: params.promotionExpiry,
    });
    
    await sendEmail({
      to: params.user.email,
      toName: params.user.displayName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      userId: params.user.userId,
      templateType: 'promotional',
    });
    
    console.log('Promotional email sent to:', params.user.email);
  } catch (error) {
    console.error('Failed to send promotional email:', error);
  }
}

export async function sendBookCompletedEmail(params: {
  user: UserInfo;
  bookTitle: string;
}): Promise<void> {
  try {
    const template = getBookCompletedTemplate({
      userName: params.user.displayName || params.user.email.split('@')[0],
      userEmail: params.user.email,
      bookTitle: params.bookTitle,
    });
    
    await sendEmail({
      to: params.user.email,
      toName: params.user.displayName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      userId: params.user.userId,
      templateType: 'book_completed',
    });
    
    console.log('Book completed email sent to:', params.user.email);
  } catch (error) {
    console.error('Failed to send book completed email:', error);
  }
}
