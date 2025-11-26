'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useState, ReactNode } from 'react';
import { mutate } from 'swr';
import type { CacheSettings } from '@/lib/definitions';

interface CacheManagerContextType {
  clearCache: () => void;
  lastCleared: Date | null;
  isEnabled: boolean;
  intervalMinutes: number;
}

const CacheManagerContext = createContext<CacheManagerContextType>({
  clearCache: () => {},
  lastCleared: null,
  isEnabled: false,
  intervalMinutes: 30,
});

export function useCacheManager() {
  return useContext(CacheManagerContext);
}

const DEFAULT_SETTINGS: CacheSettings = {
  enabled: false,
  intervalMinutes: 30,
  clearOnAIError: true,
};

interface CacheManagerProviderProps {
  children: ReactNode;
}

export function CacheManagerProvider({ children }: CacheManagerProviderProps) {
  const [settings, setSettings] = useState<CacheSettings>(DEFAULT_SETTINGS);
  const [lastCleared, setLastCleared] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearCache = useCallback(() => {
    mutate(() => true, undefined, { revalidate: true });
    
    if (typeof window !== 'undefined') {
      try {
        const keysToPreserve = ['adminToken', 'firebaseToken'];
        const preserved: Record<string, string> = {};
        
        keysToPreserve.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) preserved[key] = value;
        });
        
        sessionStorage.clear();
        
        Object.entries(preserved).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      } catch (e) {
        console.warn('Cache clear: storage operation failed', e);
      }
    }
    
    setLastCleared(new Date());
    console.log('[CacheManager] Cache cleared at', new Date().toISOString());
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/cache-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.warn('[CacheManager] Failed to fetch cache settings:', error);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    
    const refreshInterval = setInterval(fetchSettings, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [fetchSettings]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (settings.enabled && settings.intervalMinutes > 0) {
      const intervalMs = settings.intervalMinutes * 60 * 1000;
      
      console.log(`[CacheManager] Auto cache clear enabled, interval: ${settings.intervalMinutes} minutes`);
      
      intervalRef.current = setInterval(() => {
        console.log('[CacheManager] Auto clearing cache...');
        clearCache();
      }, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [settings.enabled, settings.intervalMinutes, clearCache]);

  useEffect(() => {
    if (!settings.clearOnAIError) return;

    const handleAIError = (event: CustomEvent) => {
      console.log('[CacheManager] AI error detected, clearing cache...');
      clearCache();
    };

    window.addEventListener('ai-operation-error' as any, handleAIError);
    
    return () => {
      window.removeEventListener('ai-operation-error' as any, handleAIError);
    };
  }, [settings.clearOnAIError, clearCache]);

  const value = {
    clearCache,
    lastCleared,
    isEnabled: settings.enabled,
    intervalMinutes: settings.intervalMinutes,
  };

  return (
    <CacheManagerContext.Provider value={value}>
      {children}
    </CacheManagerContext.Provider>
  );
}

export function triggerAIErrorEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai-operation-error'));
  }
}
