'use client';

import { createContext, useContext, ReactNode } from 'react';
import useSWR from 'swr';
import { useAuthUser } from '@/firebase';
import type { CreditSummary } from '@/types/subscription';

interface FeatureAccess {
  enableCoMarketer: boolean;
  enableCoWriter: boolean;
}

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  featureAccess: FeatureAccess;
}

interface CreditSummaryContextValue {
  creditSummary: CreditSummary | null;
  subscriptionStatus: SubscriptionStatus | null;
  isLoading: boolean;
  error: Error | null;
  refreshCredits: () => Promise<CreditSummary | undefined>;
  hasCoMarketerAccess: boolean;
  hasCoWriterAccess: boolean;
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

  const { data: creditData, error: creditError, isLoading: creditLoading, mutate } = useSWR<CreditSummary>(
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

  const { data: subData, isLoading: subLoading } = useSWR<SubscriptionStatus>(
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
    return await mutate();
  };

  const hasOfferCredits = (creditData?.offerCreditsAvailable ?? 0) > 0;
  const planEnablesCoMarketer = subData?.featureAccess?.enableCoMarketer ?? false;
  const planEnablesCoWriter = subData?.featureAccess?.enableCoWriter ?? false;

  const value: CreditSummaryContextValue = {
    creditSummary: creditData || null,
    subscriptionStatus: subData || null,
    isLoading: creditLoading || subLoading,
    error: creditError || null,
    refreshCredits,
    hasCoMarketerAccess: planEnablesCoMarketer || hasOfferCredits,
    hasCoWriterAccess: planEnablesCoWriter,
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
