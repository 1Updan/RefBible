import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { initVault, lockVault, migrateFromLocalStorage, getAllConfigs, deleteConfig, testApiKey, saveConfig as saveConfigToVault, type AiProviderConfig } from '@/lib/aiVault';

interface AiVaultContextValue {
  // State
  isInitialized: boolean;
  isUnlocked: boolean;
  configs: AiProviderConfig[];
  activeConfig: AiProviderConfig | null;
  error: string | null;
  
  // Actions
  unlock: (pin: string) => Promise<void>;
  lock: () => void;
  saveConfig: (config: Omit<AiProviderConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AiProviderConfig>;
  updateConfig: (id: string, updates: Partial<AiProviderConfig>) => Promise<void>;
  removeConfig: (id: string) => Promise<void>;
  setActiveConfig: (id: string | null) => void;
  testConfig: (config: AiProviderConfig) => Promise<{ valid: boolean; error?: string; models?: string[] }>;
  clearError: () => void;
}

const AiVaultContext = createContext<AiVaultContextValue | null>(null);

export function AiVaultProvider({ children, initialPin }: { children: ReactNode; initialPin?: string }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [configs, setConfigs] = useState<AiProviderConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pinRef = useRef<string | null>(initialPin ?? null);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  // Active config derived from configs + activeConfigId
  const activeConfig = configs.find(c => c.id === activeConfigId) || null;

  const clearError = useCallback(() => setError(null), []);

  const refreshConfigs = useCallback(async () => {
    try {
      const all = await getAllConfigs();
      setConfigs(all);
      
      // If active config was deleted, clear it
      if (activeConfigId && !all.find(c => c.id === activeConfigId)) {
        setActiveConfigId(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load configs');
    }
  }, [activeConfigId]);

  // Initialize vault on mount
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        // If we have a PIN, try to unlock immediately
        const pin = pinRef.current;
        if (pin) {
          await initVault(pin);
          
          // Migrate from localStorage
          const { errors } = await migrateFromLocalStorage();
          if (errors.length > 0) {
            console.warn('Migration errors:', errors);
          }
          
          await refreshConfigs();
          
          if (mounted) {
            setIsInitialized(true);
            setIsUnlocked(true);
          }
        } else {
          // No PIN yet - vault initialized but locked
          await initVault(''); // Initialize DB structure
          await refreshConfigs();
          
          if (mounted) {
            setIsInitialized(true);
            setIsUnlocked(false);
          }
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Failed to initialize AI vault');
          setIsInitialized(true);
        }
      }
    };
    
    initPromiseRef.current = init();
    
    return () => {
      mounted = false;
    };
  }, [refreshConfigs]);

  const unlock = useCallback(async (pin: string) => {
    if (isUnlocked) return;

    try {
      setError(null);
      pinRef.current = pin;
      await initVault(pin);
      await migrateFromLocalStorage();
      const all = await getAllConfigs();
      setConfigs(all);
      // Auto-select so chat works immediately after unlock: keep the
      // previous choice if it still exists, else take the first config.
      setActiveConfigId((prev) =>
        prev && all.some((c) => c.id === prev) ? prev : (all[0]?.id ?? null),
      );
      setIsUnlocked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid PIN or vault corrupted');
      throw e;
    }
  }, [isUnlocked]);

  const lock = useCallback(() => {
    lockVault();
    pinRef.current = null;
    setIsUnlocked(false);
    setConfigs([]);
    setActiveConfigId(null);
  }, []);

  const saveConfig = useCallback(async (config: Omit<AiProviderConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newConfig: AiProviderConfig = {
      ...config,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await saveConfigToVault(newConfig);
    await refreshConfigs();
    setActiveConfigId(newConfig.id);
    return newConfig;
  }, [refreshConfigs]);

  const updateConfig = useCallback(async (id: string, updates: Partial<AiProviderConfig>) => {
    const existing = configs.find(c => c.id === id);
    if (!existing) throw new Error('Config not found');
    
    const updated: AiProviderConfig = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };
    
    await saveConfigToVault(updated);
    await refreshConfigs();
  }, [configs, refreshConfigs]);

  const removeConfig = useCallback(async (id: string) => {
    await deleteConfig(id);
    await refreshConfigs();
  }, [refreshConfigs]);

  const setActiveConfig = useCallback((id: string | null) => {
    setActiveConfigId(id);
  }, []);

  const testConfig = useCallback(async (config: AiProviderConfig) => {
    return await testApiKey(config);
  }, []);

  const value: AiVaultContextValue = {
    isInitialized,
    isUnlocked,
    configs,
    activeConfig,
    error,
    unlock,
    lock,
    saveConfig,
    updateConfig,
    removeConfig,
    setActiveConfig,
    testConfig,
    clearError
  };

  return <AiVaultContext.Provider value={value}>{children}</AiVaultContext.Provider>;
}

export function useAiVault(): AiVaultContextValue {
  const context = useContext(AiVaultContext);
  if (!context) {
    throw new Error('useAiVault must be used within AiVaultProvider');
  }
  return context;
}