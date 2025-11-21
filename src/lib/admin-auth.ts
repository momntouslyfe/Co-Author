import * as crypto from 'crypto';

export interface AdminAuthResult {
  success: boolean;
  error?: string;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyAdminCredentials(email: string, password: string): AdminAuthResult {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return {
      success: false,
      error: 'Admin credentials not configured',
    };
  }

  if (email !== adminEmail) {
    return {
      success: false,
      error: 'Invalid email or password',
    };
  }

  if (password !== adminPassword) {
    return {
      success: false,
      error: 'Invalid email or password',
    };
  }

  return { success: true };
}

export function generateAdminToken(email: string): string {
  const secret = process.env.ENCRYPTION_KEY;
  
  if (!secret) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Cannot generate admin token.');
  }
  
  const timestamp = Date.now();
  const data = `${email}:${timestamp}`;
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  const signature = hmac.digest('hex');
  
  const token = Buffer.from(`${data}:${signature}`).toString('base64');
  return token;
}

export function verifyAdminToken(token: string): { valid: boolean; email?: string } {
  try {
    const secret = process.env.ENCRYPTION_KEY;
    
    if (!secret) {
      console.error('ENCRYPTION_KEY environment variable is not set. Cannot verify admin token.');
      return { valid: false };
    }
    
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [email, timestampStr, signature] = decoded.split(':');
    
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (now - timestamp > oneDay) {
      return { valid: false };
    }
    
    const data = `${email}:${timestampStr}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
      return { valid: false };
    }
    
    if (email !== process.env.ADMIN_EMAIL) {
      return { valid: false };
    }
    
    return { valid: true, email };
  } catch (error) {
    return { valid: false };
  }
}
