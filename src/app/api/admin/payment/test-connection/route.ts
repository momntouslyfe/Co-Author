import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, verifyAdminToken } from '@/lib/admin-auth';
import { testConnection } from '@/lib/uddoktapay';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const authResult = verifyAdminToken(token);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { apiKey, baseUrl } = body;

    if (!apiKey || !baseUrl) {
      return NextResponse.json(
        { error: 'API key and base URL are required' },
        { status: 400 }
      );
    }

    const result = await testConnection(apiKey, baseUrl);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
