import { NextResponse } from 'next/server';
import { getAdminSettings } from '@/lib/admin-settings';
import type { CacheSettings } from '@/lib/definitions';

const DEFAULT_CACHE_SETTINGS: CacheSettings = {
  enabled: false,
  intervalMinutes: 30,
  clearOnAIError: true,
};

export async function GET() {
  try {
    const settings = await getAdminSettings();
    
    const cacheSettings = settings?.cacheSettings || DEFAULT_CACHE_SETTINGS;
    
    return NextResponse.json(cacheSettings, {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error: any) {
    console.error('Get cache settings error:', error);
    return NextResponse.json(DEFAULT_CACHE_SETTINGS);
  }
}
