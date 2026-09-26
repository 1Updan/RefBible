import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Lock, Unlock, CheckCircle, AlertCircle, Eye, EyeOff, TestTube, Zap, Server, Cpu, Key, X, Loader2, Settings, ChevronLeft } from 'lucide-react';
import { useAiVault } from '@/contexts/AiVaultContext';
import type { AiProviderConfig } from '@/lib/aiVault';

interface ProviderDef {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number }>;
  defaultModel: string;
  defaultEndpoint?: string;
  requiresEndpoint: boolean;
  color: string;
  description: string;
}

const PROVIDERS: ProviderDef[] = [
  { 
    id: 'gemini', 
    name: 'Google Gemini', 
    icon: Sparkles,
    defaultModel: 'gemini-3.5-flash',
    defaultEndpoint: undefined,
    requiresEndpoint: false,
    color: 'from-purple-500 to-pink-500',
    description: 'Google\'s multimodal AI - fast, generous free tier'
  },
  { 
    id: 'openai', 
    name: 'OpenAI', 
    icon: Zap,
    defaultModel: 'gpt-4o-mini',
    defaultEndpoint: 'https://api.openai.com/v1',
    requiresEndpoint: true,
    color: 'from-green-500 to-emerald-500',
    description: 'GPT-4o, GPT-4, GPT-3.5 - industry standard'
  },
  { 
    id: 'ollama', 
    name: 'Ollama (Local)', 
    icon: Cpu,
    defaultModel: 'llama3.2',
    defaultEndpoint: 'http://localhost:11434',
    requiresEndpoint: true,
    color: 'from-blue-500 to-cyan-500',
    description: 'Run models locally - private, free, offline'
  },
  { 
    id: 'custom', 
    name: 'Custom (OpenAI-compatible)', 
    icon: Server,
    defaultModel: 'gpt-4o-mini',
    defaultEndpoint: '',
    requiresEndpoint: true,
    color: 'from-orange-500 to-amber-500',
    description: 'OpenAI-compatible APIs - Together, Groq, Azure, etc.'
  }
];

const MODES = [
  { id: 'context', label: 'Contextual Explanation', description: 'Verse in historical/cultural context' },
  { id: 'theology', label: 'Theological Analysis', description: 'Doctrine, systematic theology' },
  { id: 'application', label: 'Personal Application', description: 'Devotional, practical application' },
  { id: 'study', label: 'Deep Study Guide', description: 'Outline, cross-refs, word studies' },
  { id: 'custom', label: 'Custom Instruction', description: 'Write your own prompt' }
] as const;

interface AiConfigPanelProps {
  onComplete?: () => void;
  onBack?: () => void;
  isFirstRun?: boolean;
}

export function AiConfigPanel({ onComplete, onBack, isFirstRun = true }: AiConfigPanelProps) {
  const {
    isUnlocked,
    unlock,
    testConfig,
    configs,
    error: vaultError,
    clearError,
    saveConfig,
    updateConfig,
    removeConfig,
  } = useAiVault();

  // Multi-step wizard state
  type Step = 'welcome' | 'provider' | 'credentials' | 'test' | 'mode' | 'complete';
  const [step, setStep] = useState<Step>('welcome');
  const [selectedProvider, setSelectedProvider] = useState<typeof PROVIDERS[0] | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; error?: string; models?: string[] } | null>(null);
  const [selectedMode, setSelectedMode] = useState<string>('context');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Furthest wizard step ever visited: completed dots are tappable so users
  // can jump back (or forward again) freely without losing typed inputs.
  const [maxStepReached, setMaxStepReached] = useState(0);

  // Auto-focus inputs
  useEffect(() => {
    const input = document.querySelector('input[autoFocus]') as HTMLInputElement;
    input?.focus();
  }, [step]);

  const goNext = useCallback(() => {
    const steps: Step[] = ['welcome', 'provider', 'credentials', 'test', 'mode', 'complete'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1]);
      setMaxStepReached((m) => Math.max(m, idx + 1));
    }
  }, [step]);

  const goBack = useCallback(() => {
    const steps: Step[] = ['welcome', 'provider', 'credentials', 'test', 'mode', 'complete'];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
    setTestResult(null);
  }, [step]);

  const handleProviderSelect = useCallback((provider: typeof PROVIDERS[number]) => {
      setSelectedProvider(provider);
      setModel(provider.defaultModel);
      setEndpoint(provider.defaultEndpoint || '');
      setApiKey('');
      setEditingId(null);
    setTestResult(null);
    goNext();
  }, [goNext]);

  // Persist the wizard result to the encrypted vault. Without this call
  // the whole setup flow was a dead end (configs were never saved).
  const handleSaveAndActivate = useCallback(async () => {
    if (!selectedProvider || !apiKey) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        name: selectedProvider.name,
        apiKey,
        endpoint: selectedProvider.requiresEndpoint ? endpoint : undefined,
        model,
        defaultMode: selectedMode,
        provider: selectedProvider.id as AiProviderConfig['provider'],
      };
      if (editingId) {
        await updateConfig(editingId, payload);
      } else {
        await saveConfig(payload);
      }
      setEditingId(null);
      goNext();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }, [selectedProvider, apiKey, endpoint, model, selectedMode, editingId, saveConfig, updateConfig, goNext]);

  const handleEditConfig = useCallback((config: AiProviderConfig) => {
    const def = PROVIDERS.find(p => p.id === config.provider) ?? null;
    setSelectedProvider(def);
    setApiKey(config.apiKey);
    setEndpoint(config.endpoint ?? def?.defaultEndpoint ?? '');
    setModel(config.model);
    setSelectedMode(config.defaultMode ?? 'context');
    setEditingId(config.id);
    setTestResult(null);
    setSaveError(null);
    setStep('credentials');
    setMaxStepReached((m) => Math.max(m, 2));
  }, []);

  const handleRemoveConfig = useCallback((config: AiProviderConfig) => {
    if (typeof confirm === 'function' && !confirm(`Remove "${config.name}"?`)) return;
    removeConfig(config.id).catch((e) => {
      console.error('Failed to remove config:', e);
    });
  }, [removeConfig]);

  const handleTest = useCallback(async () => {
    if (!selectedProvider || !apiKey) return;
    if (selectedProvider.requiresEndpoint && !endpoint.trim()) {
      setTestResult({ valid: false, error: 'Please enter the endpoint URL first (e.g. https://openrouter.ai/api/v1).' });
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    
    const tempConfig: AiProviderConfig = {
      id: 'temp',
      name: selectedProvider.name,
      apiKey,
      endpoint: selectedProvider.requiresEndpoint ? endpoint : undefined,
      model,
      provider: selectedProvider.id as AiProviderConfig['provider'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    try {
      const result = await testConfig(tempConfig);
      setTestResult(result);
    } catch (e) {
      setTestResult({ valid: false, error: e instanceof Error ? e.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  }, [selectedProvider, apiKey, endpoint, model, testConfig]);

  // If vault is locked, show PIN entry
  if (isFirstRun && !isUnlocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 max-w-md w-full mx-auto">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary">Secure AI Vault</h2>
          <p className="text-sm text-text-secondary">
            Set a PIN to encrypt your AI API keys. This PIN is never stored — it derives the encryption key each time you unlock.
          </p>
        </div>

        <div className="w-full space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">PIN (4+ characters)</label>
            <input
              type="password"
              value={pin}
              onChange={e => { setPin(e.target.value); setPinError(null); }}
              placeholder="Enter PIN"
              autoFocus
              className="w-full px-3 py-2 text-base rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Confirm PIN</label>
            <input
              type="password"
              value={confirmPin}
              onChange={e => { setConfirmPin(e.target.value); setPinError(null); }}
              placeholder="Confirm PIN"
              className="w-full px-3 py-2 text-base rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150"
            />
          </div>
          {pinError && <p className="text-xs text-danger text-center">{pinError}</p>}
          
          <button
            onClick={async () => {
              if (pin.length < 4) {
                setPinError('PIN must be at least 4 characters');
                return;
              }
              if (pin !== confirmPin) {
                setPinError('PINs do not match');
                return;
              }
              try {
                await unlock(pin);
              } catch {
                setPinError('Failed to unlock - vault may be corrupted');
              }
            }}
            disabled={pin.length < 4 || pin !== confirmPin}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          >
            <Unlock className="w-4 h-4 mr-2 inline" /> Unlock Vault
          </button>
        </div>

        <p className="text-xs text-text-tertiary text-center">
          <Lock className="w-3 h-3 inline mr-1" /> Your PIN never leaves this device. 
          <br />Forgetting it means losing access to saved AI configs.
        </p>
      </div>
    );
  }

  // If already configured and not first run, show management view
  if (!isFirstRun && configs.length > 0) {
    return (
      <div className="flex-1 flex flex-col space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">AI Configuration</h2>
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors">
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {configs.map(config => (
          <div key={config.id} className="px-3 py-3 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <p className="font-medium text-text-primary">{config.name}</p>
                <p className="text-xs text-text-tertiary">{config.provider} · {config.model}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEditConfig(config)} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors" title="Edit" aria-label={`Edit ${config.name}`}>
                <Settings size={16} />
              </button>
              <button onClick={() => handleRemoveConfig(config)} className="p-1.5 rounded-lg text-danger hover:text-danger/80 hover:bg-danger/10 transition-colors" title="Remove" aria-label={`Remove ${config.name}`}>
                <X size={16} />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() => setStep('provider')}
          className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-all duration-150"
        >
          <Sparkles className="w-4 h-4 mr-2 inline" /> Add New AI Provider
        </button>
      </div>
    );
  }

  // Wizard steps
  const steps: Step[] = ['welcome', 'provider', 'credentials', 'test', 'mode', 'complete'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="flex-1 flex flex-col space-y-0 max-w-md w-full mx-auto">
      {/* Progress indicator */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <button
                type="button"
                onClick={() => { if (i <= maxStepReached) { setTestResult(null); setStep(s); } }}
                disabled={i > maxStepReached}
                title={i <= maxStepReached ? `Go to step ${i + 1}` : 'Complete earlier steps first'}
                aria-label={`Step ${i + 1}`}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                  i < currentStepIndex ? 'bg-accent text-white' :
                  i === currentStepIndex ? 'bg-accent/20 text-accent border border-accent' :
                  'bg-surface-elevated text-text-tertiary border border-border'
                } ${i <= maxStepReached ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
              >
                {i < currentStepIndex ? <CheckCircle size={14} /> : i + 1}
              </button>
              {i < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-1.5 ${
                  i < currentStepIndex ? 'bg-accent' : 'bg-border'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
        {vaultError && (
          <div className="px-3 py-2 rounded-lg bg-danger/10 border border-danger/30 flex items-start gap-2">
            <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
            <p className="text-xs text-danger flex-1">{vaultError}</p>
            <button onClick={clearError} className="text-danger hover:text-danger/80 p-0.5"><X size={14} /></button>
          </div>
        )}

        {/* Step: Welcome */}
        {step === 'welcome' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Welcome to AI Analysis</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Configure an AI provider to unlock verse-by-verse analysis, word studies, 
              theological insights, and personalized application.
            </p>
            <div className="px-4 py-3 rounded-xl bg-surface-elevated border border-border-subtle space-y-2 text-left">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-accent shrink-0" />
                <span>Your API key is encrypted and never leaves your device</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-accent shrink-0" />
                <span>Supports Gemini, OpenAI, Ollama (local), and custom endpoints</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-accent shrink-0" />
                <span>5 analysis modes + custom prompts</span>
              </div>
            </div>
            <button onClick={goNext} className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-all duration-150">
              Get Started
            </button>
          </div>
        )}

        {/* Step: Provider Selection */}
        {step === 'provider' && (
          <div className="space-y-3">
            <div className="text-center pb-2">
              <h3 className="text-lg font-semibold text-text-primary">Choose Your AI Provider</h3>
              <p className="text-xs text-text-tertiary">Pick one — you can add more later</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PROVIDERS.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider)}
                  className={`relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                    selectedProvider?.id === provider.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border-subtle hover:border-accent/30 hover:bg-surface-hover'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${provider.color}`}>
                    <span className="text-white"><provider.icon size={20} /></span>
                  </div>
                  <p className="text-sm font-medium text-text-primary">{provider.name}</p>
                  <p className="text-[10px] text-text-tertiary text-center leading-tight">{provider.description}</p>
                  <div className="flex items-center gap-1 text-[9px] text-text-tertiary mt-1">
                    <span><provider.icon size={10} /></span>
                    <span>{provider.requiresEndpoint ? 'Custom endpoint' : 'Managed endpoint'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Credentials */}
        {step === 'credentials' && selectedProvider && (
          <div className="space-y-4">
            <div className="text-center pb-2">
              <h3 className="text-lg font-semibold text-text-primary">{selectedProvider.name}</h3>
              <p className="text-xs text-text-tertiary">Enter your API credentials</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
                  API Key
                  <span className="text-xs text-text-tertiary">(required)</span>
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={selectedProvider.id === 'gemini' ? 'AIza...' : 'sk-...'}
                    autoFocus
                    className="w-full px-3 py-2 text-sm rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150 pr-10"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {selectedProvider.requiresEndpoint && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Endpoint <span className="text-xs text-text-tertiary">(required)</span>
                  </label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={e => setEndpoint(e.target.value)}
                    placeholder={selectedProvider.defaultEndpoint || 'https://openrouter.ai/api/v1'}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150"
                  />
                  <p className="text-[10px] text-text-tertiary">
                    {selectedProvider.id === 'ollama'
                      ? 'Default: http://localhost:11434'
                      : selectedProvider.id === 'custom'
                        ? 'Example: https://openrouter.ai/api/v1 (https:// is added automatically)'
                        : 'OpenAI-compatible endpoint URL'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Model <span className="text-xs text-text-tertiary">(required)</span>
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder={selectedProvider.defaultModel}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-150"
                />
                <p className="text-[10px] text-text-tertiary">Default: {selectedProvider.defaultModel}</p>
              </div>
            </div>

            <div className="px-3 py-2 rounded-lg bg-surface-elevated border border-border-subtle text-center">
              <p className="text-xs text-text-secondary flex items-center justify-center gap-1.5">
                <Key size={12} />
                <span>Your key is encrypted with your PIN and never sent anywhere except the provider you choose.</span>
              </p>
            </div>
          </div>
        )}

        {/* Step: Test Connection */}
        {step === 'test' && selectedProvider && (
          <div className="space-y-4 text-center">
            <h3 className="text-lg font-semibold text-text-primary">Test Connection</h3>
            <p className="text-xs text-text-tertiary">Verify your credentials work before saving</p>

            <button
              onClick={handleTest}
              disabled={testing || !apiKey || (selectedProvider.requiresEndpoint && !endpoint.trim())}
              className="w-full px-4 py-3 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
            >
              {testing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube size={18} />
                  Test Connection
                </>
              )}
            </button>

            {testResult && (
              <div className={`px-3 py-3 rounded-lg flex items-start gap-3 ${testResult.valid ? 'bg-green-500/10 border border-green-500/30' : 'bg-danger/10 border border-danger/30'}`}>
                {testResult.valid ? (
                  <CheckCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={20} className="text-danger shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-left">
                  <p className={`text-xs font-medium ${testResult.valid ? 'text-green-500' : 'text-danger'}`}>
                    {testResult.valid ? 'Connection successful!' : 'Connection failed'}
                  </p>
                  {testResult.error && (
                    <p className="text-[10px] text-text-tertiary mt-1">{testResult.error}</p>
                  )}
                  {testResult.models && testResult.models.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] text-text-tertiary mb-1.5">Tap a model to use it:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {testResult.models.slice(0, 8).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setModel(m)}
                            className={`px-2 py-1 text-[10px] font-mono rounded-lg border transition-all duration-150 cursor-pointer ${
                              model === m
                                ? 'bg-accent text-white border-accent'
                                : 'bg-surface-elevated text-text-secondary border-border-subtle hover:border-accent/40 hover:text-text-primary'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {testResult?.valid && (
              <button onClick={goNext} className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-all duration-150">
                Continue
              </button>
            )}
          </div>
        )}

        {/* Step: Mode Selection */}
        {step === 'mode' && (
          <div className="space-y-4">
            <div className="text-center pb-2">
              <h3 className="text-lg font-semibold text-text-primary">Default Analysis Mode</h3>
              <p className="text-xs text-text-tertiary">Choose how AI analyzes verses by default (changeable anytime)</p>
            </div>
            <div className="space-y-2">
              {MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                    selectedMode === mode.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border-subtle hover:border-accent/30 hover:bg-surface-hover'
                  }`}
                >
                  <p className="font-medium text-text-primary">{mode.label}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{mode.description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={handleSaveAndActivate}
              disabled={saving}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              {saving ? 'Saving…' : 'Save & Activate AI'}
            </button>
            {saveError && (
              <p className="text-xs text-danger text-center">{saveError}</p>
            )}
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <div className="text-center space-y-4 py-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">AI Ready!</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Your AI provider is configured and tested. Tap the <strong>AI button</strong> in the verse action bar 
              or the <strong>AI tab</strong> in the bottom panel to start analyzing verses.
            </p>
            <div className="px-4 py-3 rounded-xl bg-surface-elevated border border-border-subtle space-y-2 text-left">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles size={16} className="text-accent shrink-0" />
                <span>Long-press a verse → <strong>AI</strong> to analyze</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles size={16} className="text-accent shrink-0" />
                <span>Bottom panel → <strong>AI tab</strong> for chat interface</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles size={16} className="text-accent shrink-0" />
                <span>Word tab → <strong>Ask AI</strong> for word studies</span>
              </div>
            </div>
            <button
              onClick={() => { if (onComplete) onComplete(); }}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-all duration-150"
            >
              Start Using AI
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={step === 'welcome'}
          className="px-3 py-1.5 text-sm rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        <div className="text-xs text-text-tertiary">
          Step {currentStepIndex + 1} of {steps.length}
        </div>
        <button
          onClick={goNext}
          disabled={step === 'complete' || step === 'test' && !testResult?.valid || step === 'credentials' && (!apiKey || (selectedProvider?.requiresEndpoint && !endpoint.trim()))}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
        >
          {step === 'complete' ? 'Done' : 'Next'}
        </button>
      </div>
    </div>
  );
}