import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import {
  getTrialSettings,
  getUserTrialStatus,
  canStartTrial,
  startTrial,
} from '@/lib/trial-grants';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    
    const [trialSettings, trialStatus] = await Promise.all([
      getTrialSettings(),
      getUserTrialStatus(userId),
    ]);
    
    const canStart = !trialStatus.hasUsedTrial && trialSettings.enabled;
    
    return NextResponse.json({
      trialSettings: {
        enabled: trialSettings.enabled,
        durationDays: trialSettings.durationDays,
        offerCreditsAmount: trialSettings.offerCreditsAmount,
        enableCoMarketer: trialSettings.enableCoMarketer,
        enableCoWriter: trialSettings.enableCoWriter,
      },
      userStatus: {
        hasUsedTrial: trialStatus.hasUsedTrial,
        isTrialActive: trialStatus.isTrialActive,
        trialExpiresAt: trialStatus.trialExpiresAt?.toISOString(),
        trialOfferCreditsRemaining: trialStatus.trialOfferCreditsRemaining,
      },
      canStartTrial: canStart,
    });
  } catch (error: any) {
    console.error('Get trial status error:', error);
    
    if (error.message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    
    const canStartResult = await canStartTrial(userId);
    
    if (!canStartResult.canStart) {
      return NextResponse.json(
        { error: canStartResult.reason },
        { status: 400 }
      );
    }
    
    const result = await startTrial(userId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      trialExpiresAt: result.trialExpiresAt?.toISOString(),
      offerCreditsGiven: result.offerCreditsGiven,
    });
  } catch (error: any) {
    console.error('Start trial error:', error);
    
    if (error.message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
