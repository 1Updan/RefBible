/**
 * Secure AI Configuration Storage
 * Uses Web Crypto API (AES-GCM) with PBKDF2 key derivation
 * Stores in IndexedDB with encryption at rest
 */

// Database configuration
const DB_NAME = 'refbible-ai-vault';
const DB_VERSION = 1;
const STORE_NAME = 'configs';
const META_STORE = 'meta';

// Encryption parameters
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

// Types
export interface AiProviderConfig {
  id: string;
  name: string;
  apiKey: string;           // plaintext (only in memory)
  endpoint?: string;
  model: string;
  defaultMode?: string;
  temperature?: number;
  maxTokens?: number;
  systemPromptOverride?: string;
  provider: 'gemini' | 'openai' | 'ollama' | 'custom';
  createdAt: number;
  updatedAt: number;
}

export interface EncryptedConfig {
  id: string;
  name: string;
  encryptedKey: string;     // base64(iv + ciphertext + authTag)
  endpoint?: string;
  model: string;
  defaultMode?: string;
  temperature?: number;
  maxTokens?: number;
  systemPromptOverride?: string;
  provider: 'gemini' | 'openai' | 'ollama' | 'custom';
  createdAt: number;
  updatedAt: number;
}

export interface VaultMeta {
  key: string;
  value: string;
}

// Global vault instance
let db: IDBDatabase | null = null;
let masterKey: CryptoKey | null = null;
let salt: Uint8Array | null = null;

/**
 * Initialize the vault - opens DB, derives master key from user PIN
 */
export async function initVault(userPin: string): Promise<void> {
  if (db && masterKey) return; // Already initialized

  // Open IndexedDB
  db = await openDB();
  
  // Get or create salt
  salt = await getOrCreateSalt();
  
  // Derive master key from PIN + salt
  masterKey = await deriveKey(userPin, salt);
}

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Configs store
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('provider', 'provider', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      
      // Meta store (for salt, version, etc.)
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Get existing salt or create new one
 */
async function getOrCreateSalt(): Promise<Uint8Array> {
  if (!db) throw new Error('DB not initialized');
  
  return new Promise((resolve, reject) => {
    const tx = db!.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    const request = store.get('salt');
    
    request.onsuccess = () => {
      if (request.result) {
        // Existing salt
        resolve(new Uint8Array(request.result.value));
      } else {
        // Generate new salt
        const newSalt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
        store.put({ key: 'salt', value: Array.from(newSalt) });
        resolve(newSalt);
      }
    };
    
    request.onerror = () => reject(new Error('Failed to get/create salt'));
  });
}

/**
 * Derive encryption key from PIN using PBKDF2
 */
async function deriveKey(pin: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string
 */
async function encrypt(plaintext: string): Promise<string> {
  if (!masterKey) throw new Error('Vault not initialized');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    masterKey,
    data
  );
  
  // Combine iv + ciphertext (AES-GCM appends auth tag to ciphertext)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded ciphertext
 */
async function decrypt(encryptedB64: string): Promise<string> {
  if (!masterKey) throw new Error('Vault not initialized');
  
  const combined = new Uint8Array(
    atob(encryptedB64).split('').map(c => c.charCodeAt(0))
  );
  
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    masterKey,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}

/**
 * Save a provider configuration (encrypts the API key)
 */
export async function saveConfig(config: AiProviderConfig): Promise<void> {
  if (!db) throw new Error('Vault not initialized');
  
  const encryptedKey = await encrypt(config.apiKey);
  
  const encryptedConfig: EncryptedConfig = {
    id: config.id,
    name: config.name,
    encryptedKey,
    endpoint: config.endpoint,
    model: config.model,
    defaultMode: config.defaultMode,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    systemPromptOverride: config.systemPromptOverride,
    provider: config.provider,
    createdAt: config.createdAt,
    updatedAt: Date.now()
  };
  
  return new Promise((resolve, reject) => {
    const tx = db!.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(encryptedConfig);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save config'));
  });
}

/**
 * Get a provider configuration (decrypts the API key)
 */
export async function getConfig(id: string): Promise<AiProviderConfig | null> {
  if (!db) throw new Error('Vault not initialized');
  
  return new Promise((resolve, reject) => {
    const tx = db!.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = async () => {
      if (!request.result) {
        resolve(null);
        return;
      }
      
      const encrypted = request.result as EncryptedConfig;
      try {
        const apiKey = await decrypt(encrypted.encryptedKey);
        resolve({
          ...encrypted,
          apiKey,
          encryptedKey: undefined // Don't expose encrypted key
        } as AiProviderConfig);
      } catch (e) {
        reject(new Error('Failed to decrypt config - wrong PIN?'));
      }
    };
    
    request.onerror = () => reject(new Error('Failed to get config'));
  });
}

/**
 * Get all provider configurations
 */
export async function getAllConfigs(): Promise<AiProviderConfig[]> {
  if (!db) throw new Error('Vault not initialized');
  
  return new Promise((resolve, reject) => {
    const tx = db!.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = async () => {
      const results: AiProviderConfig[] = [];
      for (const encrypted of request.result as EncryptedConfig[]) {
        try {
          const apiKey = await decrypt(encrypted.encryptedKey);
          results.push({
            ...encrypted,
            apiKey,
            encryptedKey: undefined
          } as AiProviderConfig);
        } catch {
          // Skip configs that can't be decrypted (corrupted or wrong PIN)
          console.warn(`Skipping undecryptable config: ${encrypted.id}`);
        }
      }
      resolve(results);
    };
    
    request.onerror = () => reject(new Error('Failed to get all configs'));
  });
}

/**
 * Delete a provider configuration
 */
export async function deleteConfig(id: string): Promise<void> {
  if (!db) throw new Error('Vault not initialized');
  
  return new Promise((resolve, reject) => {
    const tx = db!.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete config'));
  });
}

/**
 * Test an API key by making a validation call to the provider
 */
export async function testApiKey(config: AiProviderConfig): Promise<{ valid: boolean; error?: string; models?: string[] }> {
  try {
    switch (config.provider) {
      case 'gemini':
        return await testGeminiKey(config);
      case 'openai':
      case 'custom':
        return await testOpenAiKey(config);
      case 'ollama':
        return await testOllamaKey(config);
      default:
        return { valid: false, error: 'Unknown provider' };
    }
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// NOTE: connection tests run in Rust (ai_test_connection), NOT WebView
// fetch — the app CSP blocks provider domains in the WebView, so the old
// fetch-based tests always failed in built apps (they only worked in dev).
async function testViaRust(config: AiProviderConfig): Promise<{ valid: boolean; error?: string; models?: string[] }> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<{ valid: boolean; models?: string[] }>('ai_test_connection', {
      apiKey: config.apiKey,
      provider: config.provider,
      endpoint: config.endpoint || '',
    });
    return { valid: true, models: result.models };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    if (/localhost|127\.0\.0\.1|failed to connect|Connection failed/i.test(raw) && config.provider === 'ollama') {
      return { valid: false, error: `Ollama not reachable at ${config.endpoint || 'http://localhost:11434'}` };
    }
    return { valid: false, error: raw };
  }
}

async function testGeminiKey(config: AiProviderConfig): Promise<{ valid: boolean; error?: string; models?: string[] }> {
  return testViaRust(config);
}

async function testOpenAiKey(config: AiProviderConfig): Promise<{ valid: boolean; error?: string; models?: string[] }> {
  return testViaRust(config);
}

async function testOllamaKey(config: AiProviderConfig): Promise<{ valid: boolean; error?: string; models?: string[] }> {
  return testViaRust(config);
}

/**
 * Migrate from localStorage to encrypted IndexedDB
 * Call this on app startup after initVault
 */
export async function migrateFromLocalStorage(): Promise<{ migrated: number; errors: string[] }> {
  const errors: string[] = [];
  let migrated = 0;
  
  // Check for legacy keys
  const legacyKeys = [
    'refbible-ai-key',
    'refbible-ai-provider',
    'refbible-ai-endpoint',
    'refbible-ai-model',
    'refbible-ai-saved'
  ];
  
  const hasLegacy = legacyKeys.some(k => localStorage.getItem(k));
  if (!hasLegacy) {
    return { migrated: 0, errors: [] };
  }
  
  try {
    const apiKey = localStorage.getItem('refbible-ai-key') || '';
    const provider = (localStorage.getItem('refbible-ai-provider') as AiProviderConfig['provider']) || 'gemini';
    const endpoint = localStorage.getItem('refbible-ai-endpoint') || undefined;
    const model = localStorage.getItem('refbible-ai-model') || 'gemini-2.0-flash';
    const saved = localStorage.getItem('refbible-ai-saved') === 'true';
    
    if (apiKey && saved) {
      const config: AiProviderConfig = {
        id: crypto.randomUUID(),
        name: provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : 'Custom',
        apiKey,
        endpoint,
        model,
        provider,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await saveConfig(config);
      migrated = 1;
      
      // Clear legacy keys after successful migration
      legacyKeys.forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {
    errors.push(`Migration failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  return { migrated, errors };
}

/**
 * Check if vault is initialized and unlocked
 */
export function isVaultReady(): boolean {
  return db !== null && masterKey !== null;
}

/**
 * Do encrypted configs exist on this device (readable without the PIN)?
 * Lets the UI distinguish "vault locked — enter PIN" from "nothing
 * configured yet" instead of showing the wrong empty state.
 */
export async function hasStoredConfigs(): Promise<boolean> {
  const database = await openDB();
  try {
    const count: number = await new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(new Error('Failed to read vault'));
    });
    return count > 0;
  } finally {
    // Only our own connection — the module-level `db` (if any) is untouched.
    database.close();
  }
}

/**
 * Lock the vault (clear master key from memory)
 */
export function lockVault(): void {
  masterKey = null;
  salt = null;
  // Don't close DB - just clear key from memory
}

/**
 * Close the vault completely
 */
export function closeVault(): void {
  lockVault();
  if (db) {
    db.close();
    db = null;
  }
}