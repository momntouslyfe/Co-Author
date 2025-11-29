'use client';

import { createContext, useContext, ReactNode } from 'react';
import useSWR from 'swr';
import { useAuthUser } from '@/firebase';
import type { CreditSummary } from '@/types/subscription';

type AccessSource = 'plan' | 'credits' | 'trial' | 'admin_grant' | null;

interface FeatureAccess {
  enableCoMarketer: boolean;
  enableCoWriter: boolean;
  coMarketerSource?: AccessSource;
  coWriterSource?: AccessSource;
  coMarketerExpiresAt?: Date | null;
  coWriterExpiresAt?: Date | null;
}

interface TrialInfo {
  enabled: boolean;
  hasUsedTrial: boolean;
  isTrialActive: boolean;
  trialExpiresAt?: Date | null;
  trialOfferCreditsRemaining: number;
  canStartTrial: boolean;
  trialDurationDays: number;
  trialOfferCreditsAmount: number;
  trialEnablesCoMarketer: boolean;
  trialEnablesCoWriter: boolean;
}

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  featureAccess: FeatureAccess;
  trial?: TrialInfo;
}

interface CreditSummaryContextValue {
  creditSummary: CreditSummary | null;
  subscriptionStatus: SubscriptionStatus | null;
  isLoading: boolean;
  error: Error | null;
  refreshCredits: () => Promise<CreditSummary | undefined>;
  refreshSubscription: () => Promise<SubscriptionStatus | undefined>;
  hasCoMarketerAccess: boolean;
  hasCoWriterAccess: boolean;
  coMarketerAccessSource: AccessSource;
  coWriterAccessSource: AccessSource;
  trial: TrialInfo | null;
  startTrial: () => Promise<boolean>;
}

const CreditSummaryContext = createContext<CreditSummaryContextValue | null>(null);

const fetcher = async (url: string, token: string) => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
};

export function CreditSummaryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthUser();

  const { data: creditData, error: creditError, isLoading: creditLoading, mutate: mutateCredits } = useSWR<CreditSummary>(
    user ? ['/api/user/credit-summary', user] : null,
    async ([url]) => {
      const token = await user!.getIdToken();
      return fetcher(url, token);
    },
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const { data: subData, isLoading: subLoading, mutate: mutateSub } = useSWR<SubscriptionStatus>(
    user ? ['/api/user/subscription-status', user] : null,
    async ([url]) => {
      const token = await user!.getIdToken();
      return fetcher(url, token);
    },
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const refreshCredits = async () => {
    return await mutateCredits();
  };

  const refreshSubscription = async () => {
    return await mutateSub();
  };

  const startTrial = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/user/trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to start trial:', error);
        return false;
      }
      
      await Promise.all([mutateCredits(), mutateSub()]);
      return true;
    } catch (error) {
      console.error('Error starting trial:', error);
      return false;
    }
  };

  const hasCoMarketerAccess = subData?.featureAccess?.enableCoMarketer ?? false;
  const hasCoWriterAccess = subData?.featureAccess?.enableCoWriter ?? false;
  const coMarketerAccessSource = subData?.featureAccess?.coMarketerSource ?? null;
  const coWriterAccessSource = subData?.featureAccess?.coWriterSource ?? null;

  const value: CreditSummaryContextValue = {
    creditSummary: creditData || null,
    subscriptionStatus: subData || null,
    isLoading: creditLoading || subLoading,
    error: creditError || null,
    refreshCredits,
    refreshSubscription,
    hasCoMarketerAccess,
    hasCoWriterAccess,
    coMarketerAccessSource,
    coWriterAccessSource,
    trial: subData?.trial || null,
    startTrial,
  };

  return (
    <CreditSummaryContext.Provider value={value}>
      {children}
    </CreditSummaryContext.Provider>
  );
}

export function useCreditSummary() {
  const context = useContext(CreditSummaryContext);
  if (!context) {
    throw new Error('useCreditSummary must be used within CreditSummaryProvider');
  }
  return context;
}
