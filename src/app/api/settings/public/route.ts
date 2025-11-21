import { NextResponse } from 'next/server';
import { getAdminSettings } from '@/lib/admin-settings';

export async function GET() {
  try {
    const settings = await getAdminSettings();
    
    return NextResponse.json({
      useAdminKeys: settings?.useAdminKeys || false,
      allowUserKeys: settings?.allowUserKeys !== false,
    });
  } catch (error: any) {
    console.error('Get public settings error:', error);
    return NextResponse.json(
      {
        useAdminKeys: false,
        allowUserKeys: true,
      },
      { status: 200 }
    );
  }
}
