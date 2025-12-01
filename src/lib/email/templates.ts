import type { EmailTemplateType } from '@/types/integrations';

interface TemplateData {
  userName?: string;
  userEmail?: string;
  planName?: string;
  planPrice?: number;
  currency?: string;
  creditsAmount?: number;
  creditType?: string;
  orderId?: string;
  bookTitle?: string;
  chapterTitle?: string;
  expiryDate?: string;
  renewalDate?: string;
  remainingCredits?: number;
  appUrl?: string;
  supportEmail?: string;
  companyName?: string;
  promotionTitle?: string;
  promotionDescription?: string;
  promotionCode?: string;
  promotionDiscount?: string;
  promotionExpiry?: string;
  [key: string]: any;
}

const defaultData: Partial<TemplateData> = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://co-author.com',
  supportEmail: 'support@co-author.com',
  companyName: 'Co-Author',
};

function getBaseStyles(): string {
  return `
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
      .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
      .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
      .button { display: inline-block; background: #2563eb; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
      .button:hover { background: #1d4ed8; }
      .highlight-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0; }
      .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
      .detail-label { color: #6b7280; }
      .detail-value { font-weight: 600; color: #1f2937; }
      .promo-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px dashed #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
      .promo-code { font-size: 24px; font-weight: 700; color: #92400e; letter-spacing: 2px; }
    </style>
  `;
}

function getHeader(title: string): string {
  return `
    <div class="header">
      <h1>${title}</h1>
    </div>
  `;
}

function getFooter(data: TemplateData): string {
  return `
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
      <p>
        <a href="${data.appUrl}" style="color: #2563eb;">Visit Website</a> | 
        <a href="mailto:${data.supportEmail}" style="color: #2563eb;">Contact Support</a>
      </p>
      <p style="font-size: 11px; color: #9ca3af;">
        You received this email because you have an account with ${data.companyName}.
      </p>
    </div>
  `;
}

export function getWelcomeEmailTemplate(data: TemplateData): { subject: string; html: string; text: string } {
  const mergedData = { ...defaultData, ...data };
  
  const subject = `Welcome to ${mergedData.companyName}! Let's write your book together`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${getBaseStyles()}</head>
    <body>
      <div class="container">
        ${getHeader(`Welcome, ${mergedData.userName || 'Author'}!`)}
        <div class="content">
          <p>Congratulations on taking the first step toward writing your book!</p>
          
          <p>With ${mergedData.companyName}, you have access to powerful AI-assisted tools that will help you:</p>
          
          <ul>
            <li>Research and develop compelling topics</li>
            <li>Create detailed book blueprints</li>
            <li>Write engaging chapters with AI assistance</li>
            <li>Generate marketing content for your book</li>
            <li>Create bonus materials and offers</li>
          </ul>
          
          <div class="highlight-box">
            <h3 style="margin-top: 0;">Your Account is Ready!</h3>
            <p>Log in now to start your writing journey.</p>
            <a href="${mergedData.appUrl}/dashboard" class="button">Go to Dashboard</a>
          </div>
          
          <p>Need help getting started? Check out our guides or reach out to our support team.</p>
          
          <p>Happy writing!</p>
          <p><strong>The ${mergedData.companyName} Team</strong></p>
        </div>
        ${getFooter(mergedData)}
      </div>
    </body>
    </html>
  `;
  
  const text = `
Welcome to ${mergedData.companyName}, ${mergedData.userName || 'Author'}!

Congratulations on taking the first step toward writing your book!

With ${mergedData.companyName}, you have access to powerful AI-assisted tools that will help you:
- Research and develop compelling topics
- Create detailed book blueprints
- Write engaging chapters with AI assistance
- Generate marketing content for your book
- Create bonus materials and offers

Your account is ready! Log in now: ${mergedData.appUrl}/dashboard

Happy writing!
The ${mergedData.companyName} Team
  `;
  
  return { subject, html, text };
}

export function getPurchaseConfirmationTemplate(data: TemplateData): { subject: string; html: string; text: string } {
  const mergedData = { ...defaultData, ...data };
  const currencySymbol = mergedData.currency === 'BDT' ? '৳' : '$';
  
  const subject = `Payment Confirmed - ${mergedData.planName || 'Your Purchase'}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${getBaseStyles()}</head>
    <body>
      <div class="container">
        ${getHeader('Payment Confirmed!')}
        <div class="content">
          <p>Hi ${mergedData.userName || 'there'},</p>
          
          <p>Thank you for your purchase! Your payment has been successfully processed.</p>
          
          <div class="highlight-box">
            <h3 style="margin-top: 0;">Order Details</h3>
            <div class="detail-row">
              <span class="detail-label">Order ID:</span>
              <span class="detail-value">${mergedData.orderId || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Plan/Package:</span>
              <span class="detail-value">${mergedData.planName || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value">${currencySymbol}${mergedData.planPrice?.toFixed(2) || '0.00'}</span>
            </div>
            ${mergedData.creditsAmount ? `
            <div class="detail-row" style="border-bottom: none;">
              <span class="detail-label">Credits Added:</span>
              <span class="detail-value">${mergedData.creditsAmount.toLocaleString()} ${mergedData.creditType || 'credits'}</span>
            </div>
            ` : ''}
          </div>
          
          <p>Your account has been updated and you can start using your credits right away!</p>
          
          <a href="${mergedData.appUrl}/dashboard" class="button">Go to Dashboard</a>
          
          <p style="margin-top: 30px;">If you have any questions about your purchase, please contact our support team.</p>
          
          <p>Best regards,<br><strong>The ${mergedData.companyName} Team</strong></p>
        </div>
        ${getFooter(mergedData)}
      </div>
    </body>
    </html>
  `;
  
  const text = `
Payment Confirmed!

Hi ${mergedData.userName || 'there'},

Thank you for your purchase! Your payment has been successfully processed.

Order Details:
- Order ID: ${mergedData.orderId || 'N/A'}
- Plan/Package: ${mergedData.planName || 'N/A'}
- Amount: ${currencySymbol}${mergedData.planPrice?.toFixed(2) || '0.00'}
${mergedData.creditsAmount ? `- Credits Added: ${mergedData.creditsAmount.toLocaleString()} ${mergedData.creditType || 'credits'}` : ''}

Your account has been updated. Start using your credits: ${mergedData.appUrl}/dashboard

Best regards,
The ${mergedData.companyName} Team
  `;
  
  return { subject, html, text };
}

export function getSubscriptionActivatedTemplate(data: TemplateData): { subject: string; html: string; text: string } {
  const mergedData = { ...defaultData, ...data };
  
  const subject = `Your ${mergedData.planName} Subscription is Now Active!`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${getBaseStyles()}</head>
    <body>
      <div class="container">
        ${getHeader('Subscription Activated!')}
        <div class="content">
          <p>Hi ${mergedData.userName || 'there'},</p>
          
          <p>Great news! Your <strong>${mergedData.planName}</strong> subscription is now active.</p>
          
          <div class="highlight-box">
            <h3 style="margin-top: 0;">Subscription Details</h3>
            <div class="detail-row">
              <span class="detail-label">Plan:</span>
              <span class="detail-value">${mergedData.planName}</span>
            </div>
            ${mergedData.creditsAmount ? `
            <div class="detail-row">
              <span class="detail-label">Monthly Credits:</span>
              <span class="detail-value">${mergedData.creditsAmount.toLocaleString()} ${mergedData.creditType || 'credits'}</span>
            </div>
            ` : ''}
            ${mergedData.renewalDate ? `
            <div class="detail-row" style="border-bottom: none;">
              <span class="detail-label">Next Renewal:</span>
              <span class="detail-value">${mergedData.renewalDate}</span>
            </div>
            ` : ''}
          </div>
          
          <p>You now have full access to all the features included in your plan. Start creating!</p>
          
          <a href="${mergedData.appUrl}/dashboard" class="button">Start Writing</a>
          
          <p>Best regards,<br><strong>The ${mergedData.companyName} Team</strong></p>
        </div>
        ${getFooter(mergedData)}
      </div>
    </body>
    </html>
  `;
  
  const text = `
Your ${mergedData.planName} Subscription is Now Active!

Hi ${mergedData.userName || 'there'},

Great news! Your ${mergedData.planName} subscription is now active.

Subscription Details:
- Plan: ${mergedData.planName}
${mergedData.creditsAmount ? `- Monthly Credits: ${mergedData.creditsAmount.toLocaleString()} ${mergedData.creditType || 'credits'}` : ''}
${mergedData.renewalDate ? `- Next Renewal: ${mergedData.renewalDate}` : ''}

Start creating: ${mergedData.appUrl}/dashboard

Best regards,
The ${mergedData.companyName} Team
  `;
  
  return { subject, html, text };
}

export function getCreditsAddedTemplate(data: TemplateData): { subject: string; html: string; text: string } {
  const mergedData = { ...defaultData, ...data };
  
  const subject = `${mergedData.creditsAmount?.toLocaleString()} Credits Added to Your Account`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${getBaseStyles()}</head>
    <body>
      <div class="container">
        ${getHeader('Credits Added!')}
        <div class="content">
          <p>Hi ${mergedData.userName || 'there'},</p>
          
          <p>Your account has been topped up with new credits!</p>
          
          <div class="highlight-box" style="text-align: center;">
            <p style="font-size: 48px; font-weight: 700; color: #2563eb; margin: 0;">
              +${mergedData.creditsAmount?.toLocaleString() || 0}
            </p>
            <p style="color: #6b7280; margin: 5px 0 0 0;">${mergedData.creditType || 'credits'} added</p>
          </div>
          
          <p>Your new credits are ready to use. Continue working on your projects!</p>
          
          <a href="${mergedData.appUrl}/dashboard" class="button">Go to Dashboard</a>
          
          <p>Best regards,<br><strong>The ${mergedData.companyName} Team</strong></p>
        </div>
        ${getFooter(mergedData)}
      </div>
    </body>
    </html>
  `;
  
  const text = `
Credits Added to Your Account!

Hi ${mergedData.userName || 'there'},

Your account has been topped up with ${mergedData.creditsAmount?.toLocaleString() || 0} ${mergedData.creditType || 'credits'}!

Your new credits are ready to use. Continue working on your projects: ${mergedData.appUrl}/dashboard

Best regards,
The ${mergedData.companyName} Team
  `;
  
  return { subject, html, text };
}

export function getCreditsLowTemplate(data: TemplateData): { subject: string; html: string; text: string } {
  const mergedData = { ...defaultData, ...data };
  
  const subject = `Your ${mergedData.creditType || 'credits'} are running low`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${getBaseStyles()}</head>
    <body>
      <div class="container">
        ${getHeader('Credits Running Low')}
        <div class="content">
          <p>Hi ${mergedData.userName || 'there'},</p>
          
          <p>Just a friendly reminder that your credits are running low.</p>
          
          <div class="highlight-box" style="text-align: center; background: #fef3c7; border-color: #fde68a;">
            <p style="font-size: 36px; font-weight: 700; color: #92400e; margin: 0;">
              ${mergedData.remainingCredits?.toLocaleString() || 0}
            </p>
            <p style="color: #92400e; margin: 5px 0 0 0;">${mergedData.creditType || 'credits'} remaining</p>
          </div>
          
          <p>Don't let your writing momentum stop! Top up your credits now to continue creating amazing content.</p>
          
          <a href="${mergedData.appUrl}/dashboard/credits/purchase" class="button">Buy More Credits</a>
          
          <p>Best regards,<br><strong>The ${mergedData.companyName} Team</strong></p>
        </div>
        ${getFooter(mergedData)}
      </div>
    </body>
    </html>
  `;
  
  const text = `
Your ${mergedData.creditType || 'credits'} are running low!

Hi ${mergedData.userName || 'there'},

You have ${mergedData.remainingCredits?.toLocaleString() || 0} ${mergedData.creditType || 'credits'} remaining.

Don't let your writing momentum stop! Top up now: ${mergedData.appUrl}/dashboard/credits/purchase

Best regards,
The ${mergedData.companyName} Team
  `;
  
  return { subject, html, text };
}

export function getPromotionalTemplate(data: TemplateData): { subject: string; html: string; text: string } {
  const mergedData = { ...defaultData, ...data };
  
  const subject = mergedData.promotionTitle || `Special Offer from ${mergedData.companyName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${getBaseStyles()}</head>
    <body>
      <div class="container">
        ${getHeader(mergedData.promotionTitle || 'Special Offer!')}
        <div class="content">
          <p>Hi ${mergedData.userName || 'there'},</p>
          
          <p>${mergedData.promotionDescription || 'We have an exciting offer just for you!'}</p>
          
          ${mergedData.promotionCode ? `
          <div class="promo-box">
            <p style="margin: 0 0 10px 0; color: #92400e;">Use code:</p>
            <p class="promo-code">${mergedData.promotionCode}</p>
            ${mergedData.promotionDiscount ? `<p style="margin: 10px 0 0 0; color: #92400e; font-weight: 600;">${mergedData.promotionDiscount}</p>` : ''}
            ${mergedData.promotionExpiry ? `<p style="margin: 10px 0 0 0; font-size: 12px; color: #b45309;">Valid until: ${mergedData.promotionExpiry}</p>` : ''}
          </div>
          ` : ''}
          
          <a href="${mergedData.appUrl}" class="button">Claim Offer</a>
          
          <p>Don't miss out on this opportunity!</p>
          
          <p>Best regards,<br><strong>The ${mergedData.companyName} Team</strong></p>
        </div>
        ${getFooter(mergedData)}
      </div>
    </body>
    </html>
  `;
  
  const text = `
${mergedData.promotionTitle || 'Special Offer!'}

Hi ${mergedData.userName || 'there'},

${mergedData.promotionDescription || 'We have an exciting offer just for you!'}

${mergedData.promotionCode ? `Use code: ${mergedData.promotionCode}` : ''}
${mergedData.promotionDiscount ? mergedData.promotionDiscount : ''}
${mergedData.promotionExpiry ? `Valid until: ${mergedData.promotionExpiry}` : ''}

Claim your offer: ${mergedData.appUrl}

Best regards,
The ${mergedData.companyName} Team
  `;
  
  return { subject, html, text };
}

export function getBookCompletedTemplate(data: TemplateData): { subject: string; html: string; text: string } {
  const mergedData = { ...defaultData, ...data };
  
  const subject = `Congratulations! "${mergedData.bookTitle}" is Complete!`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${getBaseStyles()}</head>
    <body>
      <div class="container">
        ${getHeader('Book Completed!')}
        <div class="content">
          <p>Hi ${mergedData.userName || 'there'},</p>
          
          <p>Amazing work! You've completed your book:</p>
          
          <div class="highlight-box" style="text-align: center;">
            <h2 style="color: #2563eb; margin: 0;">"${mergedData.bookTitle || 'Your Book'}"</h2>
          </div>
          
          <p>This is a huge accomplishment. You should be proud of yourself!</p>
          
          <p>What's next?</p>
          <ul>
            <li>Review and edit your chapters</li>
            <li>Generate marketing content</li>
            <li>Create bonus materials and offers</li>
            <li>Export your book for publishing</li>
          </ul>
          
          <a href="${mergedData.appUrl}/dashboard" class="button">View Your Book</a>
          
          <p>Congratulations again!</p>
          <p><strong>The ${mergedData.companyName} Team</strong></p>
        </div>
        ${getFooter(mergedData)}
      </div>
    </body>
    </html>
  `;
  
  const text = `
Congratulations! "${mergedData.bookTitle}" is Complete!

Hi ${mergedData.userName || 'there'},

Amazing work! You've completed your book: "${mergedData.bookTitle || 'Your Book'}"

This is a huge accomplishment. You should be proud of yourself!

What's next?
- Review and edit your chapters
- Generate marketing content
- Create bonus materials and offers
- Export your book for publishing

View your book: ${mergedData.appUrl}/dashboard

Congratulations again!
The ${mergedData.companyName} Team
  `;
  
  return { subject, html, text };
}

export function getEmailTemplate(type: EmailTemplateType, data: TemplateData): { subject: string; html: string; text: string } {
  switch (type) {
    case 'welcome':
      return getWelcomeEmailTemplate(data);
    case 'purchase_confirmation':
      return getPurchaseConfirmationTemplate(data);
    case 'subscription_activated':
      return getSubscriptionActivatedTemplate(data);
    case 'credits_added':
      return getCreditsAddedTemplate(data);
    case 'credits_low':
      return getCreditsLowTemplate(data);
    case 'promotional':
      return getPromotionalTemplate(data);
    case 'book_completed':
      return getBookCompletedTemplate(data);
    default:
      throw new Error(`Unknown email template type: ${type}`);
  }
}
