import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

export interface AdminAuthResult {
  success: boolean;
  error?: string;
}

export function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function hashPasswordWithBcrypt(password: string): string {
  const saltRounds = 10;
  return bcrypt.hashSync(password, saltRounds);
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

  let isPasswordValid = false;

  if (adminPassword.startsWith('$2a$') || adminPassword.startsWith('$2b$') || adminPassword.startsWith('$2y$')) {
    isPasswordValid = bcrypt.compareSync(password, adminPassword);
  } else {
    console.warn('WARNING: Admin password is stored in plain text. Please update to use bcrypt hashed password for security.');
    isPasswordValid = password === adminPassword;
  }

  if (!isPasswordValid) {
    return {
      success: false,
      error: 'Invalid email or password',
    };
  }

  return { success: true };
}

export function generateAdminToken(email: string): string {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  
  if (!secret) {
    throw new Error('ADMIN_TOKEN_SECRET environment variable is not set. This is required for secure token generation. Please configure ADMIN_TOKEN_SECRET as a separate secret from ENCRYPTION_KEY.');
  }
  
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const data = `${email}:${timestamp}:${nonce}`;
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  const signature = hmac.digest('hex');
  
  const token = Buffer.from(`${data}:${signature}`).toString('base64');
  return token;
}

export function verifyAdminToken(token: string): { valid: boolean; email?: string } {
  try {
    const secret = process.env.ADMIN_TOKEN_SECRET;
    
    if (!secret) {
      console.error('ADMIN_TOKEN_SECRET environment variable is not set. Cannot verify admin token.');
      return { valid: false };
    }
    
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    
    if (parts.length !== 4) {
      return { valid: false };
    }
    
    const [email, timestampStr, nonce, signature] = parts;
    
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (now - timestamp > oneDay) {
      return { valid: false };
    }
    
    const data = `${email}:${timestampStr}:${nonce}`;
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
