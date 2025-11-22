'use client';

import { createContext, useContext, ReactNode } from 'react';
import useSWR from 'swr';
import { useAuthUser } from '@/firebase';
import type { CreditSummary } from '@/types/subscription';

interface CreditSummaryContextValue {
  creditSummary: CreditSummary | null;
  isLoading: boolean;
  error: Error | null;
  refreshCredits: () => void;
}

const CreditSummaryContext = createContext<CreditSummaryContextValue | null>(null);

const fetcher = async (url: string, token: string) => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch credit summary');
  return response.json();
};

export function CreditSummaryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthUser();

  const { data, error, isLoading, mutate } = useSWR<CreditSummary>(
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

  const refreshCredits = () => {
    mutate();
  };

  const value: CreditSummaryContextValue = {
    creditSummary: data || null,
    isLoading,
    error: error || null,
    refreshCredits,
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
