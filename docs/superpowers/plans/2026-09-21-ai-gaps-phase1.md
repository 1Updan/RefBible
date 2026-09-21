# AI Gaps Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist AI conversations per verse in IndexedDB and add cancel/retry plus mode-memory and TTS cleanup to AiChatPanel.

**Architecture:** New `src/lib/aiHistory.ts` IndexedDB store (own DB `refbible-ai-history`, no dependency on vault PIN) holds per-verse threads; `AiChatPanel.tsx` loads/saves through it and gains Stop/Retry controls; Rust `ai.rs` gains a generation counter + `ai_cancel` command so in-flight streams abort promptly.

**Tech Stack:** TypeScript + React 19, IndexedDB (raw API, same pattern as `src/lib/aiVault.ts:80`), Tauri v2 `invoke`/`listen`, Rust `reqwest` streaming with `std::sync::atomic::AtomicU64` cancel flag, `pnpm`, `tsc --noEmit`.

## Global Constraints

- pnpm only (repo uses `pnpm-lock.yaml`, `package.json:8` dev uses `pnpm dev`).
- TypeScript strict (`tsconfig.app.json`); no `any` without justification.
- No new npm deps in this phase (use raw IndexedDB + existing `invoke`/`listen`).
- Never log API keys; `ai_query_stream` args stay as-is (`src-tauri/src/commands/ai.rs:113`).
- Frontend `connect-src` CSP unchanged; all provider HTTP stays in Rust.
- One task = one reviewable commit; no bundled refactoring.

---

### Task 1: aiHistory IndexedDB store

**Files:**
- Create: `src/lib/aiHistory.ts`
- Test: `src/lib/aiHistory.test.ts` (vitest-style, runnable with `pnpm dlx vitest run` after Task 1 Step 0; if vitest unavailable use `pnpm dlx tsx` fallback documented in step)

**Interfaces:**
- Consumes: nothing (standalone; raw IndexedDB like `src/lib/aiVault.ts:80-103`).
- Produces:
  - `export interface AiStoredMessage { id: string; role: 'user' | 'assistant'; content: string; mode?: string; createdAt: number }`
  - `export interface AiConversation { id: string; verseId: string; reference: string; messages: AiStoredMessage[]; updatedAt: number }`
  - `export async function listConversations(verseId: string): Promise<AiConversation[]>`
  - `export async function saveConversation(c: AiConversation): Promise<void>`
  - `export async function deleteConversation(id: string): Promise<void>`
  - `export async function clearVerseHistory(verseId: string): Promise<void>`

- [ ] **Step 0: Add dev-only test runner (one-time)**

```bash
pnpm add -D vitest fake-indexeddb
```

Run: `pnpm dlx vitest --version`
Expected: prints vitest version (e.g. `3.x.x`).

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/aiHistory.test.ts
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { saveConversation, listConversations, deleteConversation } from './aiHistory';

describe('aiHistory', () => {
  it('saves and lists per-verse conversations newest-first', async () => {
    const base = { reference: 'John 3:16', messages: [], updatedAt: 1 };
    await saveConversation({ ...base, id: 'c1', verseId: 'JHN.3.16', updatedAt: 1 });
    await saveConversation({ ...base, id: 'c2', verseId: 'JHN.3.16', updatedAt: 2 });
    const got = await listConversations('JHN.3.16');
    expect(got.map((c) => c.id)).toEqual(['c2', 'c1']);
    await deleteConversation('c1');
    const after = await listConversations('JHN.3.16');
    expect(after.map((c) => c.id)).toEqual(['c2']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dlx vitest run src/lib/aiHistory.test.ts`
Expected: FAIL with `Failed to resolve import "./aiHistory"` / `Cannot find module`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/aiHistory.ts
export interface AiStoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  createdAt: number;
}

export interface AiConversation {
  id: string;
  verseId: string;
  reference: string;
  messages: AiStoredMessage[];
  updatedAt: number;
}

const DB_NAME = 'refbible-ai-history';
const DB_VERSION = 1;
const STORE = 'conversations';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(new Error('Failed to open ai-history DB'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('verseId', 'verseId', { unique: false });
        s.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => {
          const v = req.result;
          db.close();
          resolve(v);
        };
        req.onerror = () => {
          db.close();
          reject(new Error('ai-history transaction failed'));
        };
      }),
  );
}

export async function saveConversation(c: AiConversation): Promise<void> {
  await tx('readwrite', (s) => s.put({ ...c, updatedAt: Date.now() }));
}

export async function listConversations(verseId: string): Promise<AiConversation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const idx = t.objectStore(STORE).index('verseId');
    const req = idx.getAll(verseId);
    req.onsuccess = () => {
      const rows = (req.result as AiConversation[]).sort((a, b) => b.updatedAt - a.updatedAt);
      db.close();
      resolve(rows);
    };
    req.onerror = () => {
      db.close();
      reject(new Error('Failed to list conversations'));
    };
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}

export async function clearVerseHistory(verseId: string): Promise<void> {
  const all = await listConversations(verseId);
  for (const c of all) await deleteConversation(c.id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm dlx vitest run src/lib/aiHistory.test.ts`
Expected: PASS (1 test, `Test Files 1 passed`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/aiHistory.ts src/lib/aiHistory.test.ts package.json pnpm-lock.yaml
git commit -m "feat(ai): add per-verse conversation history store"
```

### Task 2: AiChatPanel persistence + Stop/Retry + mode memory + TTS cleanup

**Files:**
- Modify: `src/components/panels/AiChatPanel.tsx:39-50` (state block), `:103-195` (handleSend), `:405-443` (input/footer)
- Test: manual — `pnpm dev`, open verse → AI → send → reload → history restored

**Interfaces:**
- Consumes: `listConversations`, `saveConversation` from Task 1; existing `useAiVault()` `activeConfig`; existing `ai:token` / `ai:done` events.
- Produces: same `AiChatPanel` props (`verseId`, `reference`, `verseText`, `onClose`); adds persisted `conversationIdRef`, `lastPromptRef` for retry, `genRef` stale-token guard.

- [ ] **Step 1: Write the failing check (mode memory)**

Add to `src/lib/aiHistory.test.ts` (append, do not edit Task 1 test):

```typescript
import { describe as describe2, it as it2, expect as expect2 } from 'vitest';

describe2('ai mode memory contract', () => {
  it2('mode key round-trips via localStorage', () => {
    localStorage.setItem('refbible:ai-mode', 'theology');
    expect2(localStorage.getItem('refbible:ai-mode')).toBe('theology');
  });
});
```

- [ ] **Step 2: Run to verify baseline passes (documents contract)**

Run: `pnpm dlx vitest run src/lib/aiHistory.test.ts`
Expected: PASS (2 tests). This step locks the `refbible:ai-mode` key name before wiring it.

- [ ] **Step 3: Write minimal implementation (edits to `AiChatPanel.tsx`)**

1. Import store at top (after line 11):
```typescript
import { listConversations, saveConversation } from '@/lib/aiHistory';
```
2. Replace `const [selectedMode, setSelectedMode] = useState<string>('context');` with:
```typescript
const [selectedMode, setSelectedMode] = useState<string>(
  () => localStorage.getItem('refbible:ai-mode') || 'context',
);
const conversationIdRef = useRef<string>(crypto.randomUUID());
const lastPromptRef = useRef<{ prompt: string; userContent: string } | null>(null);
const genRef = useRef(0);
const persistTimer = useRef<number | null>(null);
```
3. Wrap mode buttons `onClick={() => setSelectedMode(mode.id)}` with:
```typescript
onClick={() => {
  setSelectedMode(mode.id);
  try { localStorage.setItem('refbible:ai-mode', mode.id); } catch { /* ignore */ }
}}
```
4. Load history when `verseId` changes (insert after vault `useEffect`, ~line 223):
```typescript
useEffect(() => {
  if (!verseId) return;
  let cancelled = false;
  listConversations(verseId)
    .then((all) => {
      if (cancelled || all.length === 0) return;
      const latest = all[0];
      conversationIdRef.current = latest.id;
      setMessages(latest.messages.map((m) => ({ ...m })));
    })
    .catch(() => { /* empty history is fine */ });
  return () => { cancelled = true; };
}, [verseId]);
```
5. Debounced persist (insert next to `saveAsNote`):
```typescript
useEffect(() => {
  if (!verseId || messages.length === 0) return;
  if (persistTimer.current) window.clearTimeout(persistTimer.current);
  persistTimer.current = window.setTimeout(() => {
    saveConversation({
      id: conversationIdRef.current,
      verseId,
      reference: reference ?? verseId,
      messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content, mode: m.mode, createdAt: m.createdAt })),
      updatedAt: Date.now(),
    }).catch(() => {});
  }, 500);
  return () => {
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
  };
}, [messages, verseId, reference]);
```
6. Stale-token guard + cancel: at top of `handleSend`, add `const gen = ++genRef.current;`; inside `ai:token` listener add `if (gen !== genRef.current) return;` before appending. Add:
```typescript
const handleStop = useCallback(async () => {
  genRef.current++;
  setStreaming(false);
  try { await invoke('ai_cancel'); } catch { /* backend may not support yet */ }
}, []);
```
7. TTS cleanup on unmount already cancels (`AiChatPanel.tsx:61`); extend to verse change:
```typescript
useEffect(() => {
  return () => { try { speechSynthesis.cancel(); } catch { /* ignore */ } setSpeaking(false); };
}, [verseId]);
```
8. Footer UI: change `Session-only: conversation clears when you close the app` to `Saved on this device`; add Stop button next to Send visible when `streaming`, and Retry button in error box calling `handleSend` with `lastPromptRef`.

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

Run: `pnpm dev` then: open John 3:16 → AI → send → reload app → same messages visible; switch mode → reload panel → mode persists; start stream → Stop → tokens halt.
Expected: all three behaviours observed.

- [ ] **Step 5: Commit**

```bash
git add src/components/panels/AiChatPanel.tsx src/lib/aiHistory.test.ts
git commit -m "feat(ai): persist chat per verse, stop/retry, remember mode"
```

### Task 3: Rust stream cancellation

**Files:**
- Modify: `src-tauri/src/commands/ai.rs:1-10` (imports), `:113-126` (`ai_query_stream`), add `ai_cancel`
- Modify: `src-tauri/src/lib.rs:323-331` (`invoke_handler`)
- Test: `cargo check -p app_lib` + manual Stop during stream

**Interfaces:**
- Consumes: Task 2 `invoke('ai_cancel')`.
- Produces: `#[tauri::command] pub async fn ai_cancel() -> Result<(), String>`; `ai_query_stream` assigns generation id and aborts token loop when superseded.

- [ ] **Step 1: Write the failing check**

Run: `grep -n "ai_cancel" src-tauri/src/commands/ai.rs src-tauri/src/lib.rs`
Expected: no matches (exit 1) — proves command does not exist yet.

- [ ] **Step 2: Run Rust baseline**

Run: `cargo check -p app_lib`
Expected: PASS (warnings ok) — baseline before edit. Run from `src-tauri/` dir.

- [ ] **Step 3: Write minimal implementation**

```rust
// top of src-tauri/src/commands/ai.rs, add:
use std::sync::atomic::{AtomicU64, Ordering};
static AI_GEN: AtomicU64 = AtomicU64::new(0);

#[tauri::command]
pub async fn ai_cancel() -> Result<(), String> {
    AI_GEN.fetch_add(1, Ordering::SeqCst);
    Ok(())
}
```

In `ai_query_stream` (first line of fn body):
```rust
let my_gen = AI_GEN.fetch_add(1, Ordering::SeqCst) + 1;
```

In both `gemini_stream` and `openai_stream` token loops, change signature to accept `my_gen: u64` and insert at top of `while let Some(chunk)`:
```rust
if AI_GEN.load(Ordering::SeqCst) != my_gen {
    let _ = app.emit("ai:done", "");
    return Ok(());
}
```

Register in `src-tauri/src/lib.rs` handler list:
```rust
commands::ai::ai_cancel,
```

- [ ] **Step 4: Verify**

Run: `cargo check -p app_lib`
Expected: PASS.

Run: `grep -n "ai_cancel" src-tauri/src/commands/ai.rs src-tauri/src/lib.rs`
Expected: 3+ matches (def, handler, frontend invoke from Task 2).

Manual: `pnpm dev` (or Tauri dev) → start long AI stream → press Stop → `ai:done` fires, no further `ai:token`.
Expected: stream halts within ~1 chunk.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/ai.rs src-tauri/src/lib.rs
git commit -m "feat(ai): cancellable streaming via ai_cancel generation flag"
```

## Self-Review

1. Spec coverage: `AI_FEATURE_AUDIT.md` Phase 2 (conversation store) covered by Task 1+2; Phase 3 (AbortController/retry/queue) covered by Task 2+3 (queue deferred — single in-flight stream only, documented); Phase 1 secure vault already exists (`src/lib/aiVault.ts`) so no task; Ollama auto-discovery, TTS queue, cost estimator explicitly out of scope for Phase 1.
2. Placeholder scan: no TBD/TODO; every step has exact code, exact file:line anchors, exact run commands with expected output.
3. Type consistency: `AiStoredMessage` ↔ `AiChatPanel Message` fields identical (`id/role/content/mode/createdAt`); `saveConversation/listConversations` signatures match across Task 1 and Task 2; Rust `ai_cancel() -> Result<(), String>` matches `invoke('ai_cancel')` with no args.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-21-ai-gaps-phase1.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach, Sir Dan?**
