# RefBible — Complete Implementation Plan

> **Version:** 1.0 | **Status:** Draft | **Est. Effort:** ~25 working days

---

## Overview

RefBible is an ultra-lightweight, cross-platform (Windows/Android/iOS) Scripture research application. It treats text as a fluid, multi-dimensional relational network rather than static pages, prioritizing pure typographic reading immersion and deep theological analysis.

This plan breaks down the full implementation into 8 phases, from foundation through production deployment.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 🛠️ | Implementation task |
| ⚙️ | Configuration |
| 🧪 | Testing / Verification |
| 🔒 | Security hardening |

---

## Phase 0: Foundation & Tooling (~1 day)

**Goal:** Solidify the project scaffold, install missing deps, configure Tailwind v4, set up Git, establish project conventions.

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 0.1 | **Initialize Git repo** | ⚙️ | `git init`, create conventional commit convention | DevOps §1 |
| 0.2 | **Create `.gitignore` additions** | ⚙️ | Add `docs/`, `*.log`, `.tauri/` if missing | DevOps §1 |
| 0.3 | **Install `@tailwindcss/vite`** | 🛠️ | Tailwind v4 Vite plugin (cleaner than PostCSS for this stack) | Architecture §1 |
| 0.4 | **Configure Tailwind v4** | ⚙️ | Add to `vite.config.ts` plugins; add `@import "tailwindcss"` to `src/index.css`; add `@plugin "@tailwindcss/typography"` | Architecture §1 |
| 0.5 | **Install missing deps** | 🛠️ | `@radix-ui/react-context-menu`, `@tanstack/react-virtual`, `lucide-react` (icons), `clsx` (class utilities) | Architecture §3, Domain 3 §3 |
| 0.6 | **Set up path aliases** | ⚙️ | `@/` → `src/` in both `vite.config.ts` and `tsconfig.app.json` | DevOps |
| 0.7 | **Harden Tauri config** | ⚙️ | Fix `identifier` → `com.refbible.app`, set strict CSP, window title `RefBible`, default size 1200×800 | Architecture §1 |
| 0.8 | **Create folder structure** | 🛠️ | `src/components/`, `src/hooks/`, `src/contexts/`, `src/lib/`, `src/types/`, `src/db/`, `src-tauri/src/commands/` | Architecture |
| 0.9 | **Verify setup** | 🧪 | `pnpm run dev` + `pnpm run build` + `tsc --noEmit` all pass | DevOps §5 |

**Key decisions:**
- Tailwind CSS v4 via Vite plugin (not PostCSS) — fewer config files, faster builds
- Lucide React for all icons (consistent stroke-based SVG — matches "no emoji as icons" rule from UI/UX guidelines)
- Breakpoint: 768px per Domain 3 §2

---

## Phase 1: Database & Rust Backend (~2 days)

**Goal:** Implement the SQLite database layer — schema, seed data, and Tauri IPC commands.

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 1.1 | **Define TypeScript types** | 🛠️ | `src/types/db.ts` — `Verse`, `ContentText`, `CrossReference`, `Bookmark`, `Note`, `AiCache` interfaces | Architecture §2 |
| 1.2 | **Write SQL DDL schema** | 🛠️ | `src-tauri/src/schema.sql` — `CREATE TABLE IF NOT EXISTS` for all 6 relational tables | Architecture §2 |
| 1.3 | **Write Rust DB init module** | 🛠️ | `src-tauri/src/db.rs` — resolve `app_data_dir`, check if `.db` exists, execute DDL, run seed on first cold boot | Architecture §2, DevOps §4 |
| 1.4 | **Bundle seed data** | 🛠️ | `src-tauri/src/seed.rs` — John 1 in KJV + NASB parallel; `BEGIN TRANSACTION` + bulk `INSERT OR IGNORE` | DevOps §4 |
| 1.5 | **Register DB init in Tauri setup** | 🛠️ | Hook `db::init()` into `lib.rs` `setup()` closure before window creation | Architecture §4 |
| 1.6 | **Create Rust IPC commands** | 🛠️ | `src-tauri/src/commands/mod.rs`: `get_verses(book_id, chapter)`, `get_translations(verse_id)`, `get_cross_references(verse_id)`, `get_bookmarks()`, `save_bookmark(verse_id)`, `get_notes(verse_id)`, `save_note(verse_id, text)`, `check_cache(verse_id, mode)`, `write_cache(verse_id, mode, response)` | Architecture §4 |
| 1.7 | **Create frontend DB bridge** | 🛠️ | `src/lib/db.ts` — typed wrapper over `@tauri-apps/plugin-sql`, functions mirroring Rust commands | Architecture §4 |
| 1.8 | **Test DB lifecycle** | 🧪 | Cold boot → DB creation → seed insert → `get_verses(43, 1)` returns John 1 verses | DevOps §5 |

**Schema design (6 tables):**

```sql
CREATE TABLE IF NOT EXISTS verses (
  id TEXT PRIMARY KEY,          -- e.g. "JHN.1.1"
  book_id INTEGER NOT NULL,
  chapter_num INTEGER NOT NULL,
  verse_num INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS content_text (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL REFERENCES verses(id),
  translation_code TEXT NOT NULL,  -- "KJV", "NASB"
  text_data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cross_references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origin_verse_id TEXT NOT NULL REFERENCES verses(id),
  target_verse_id TEXT NOT NULL REFERENCES verses(id),
  thematic_weight INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL REFERENCES verses(id)
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL REFERENCES verses(id),
  text_content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_commentary_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL,
  query_mode TEXT NOT NULL,       -- 'strict' or 'research'
  cached_response TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Phase 2: Core Reading UI (~4 days)

**Goal:** Build the complete reading experience — typography, three color modes, virtualized list, responsive layout.

### 2A — Design Tokens & Theming

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 2.1 | **Define CSS design tokens** | ⚙️ | Custom properties in `src/index.css`: color scales for 3 modes, type scale, spacing, z-index layers | Domain 3 §1, UI/UX §6 |
| 2.2 | **Create `useTheme` context** | 🛠️ | `src/contexts/ThemeContext.tsx` — toggle `light` | `sepia` | `dark`, persist to `localStorage`, apply `data-theme` on `<html>` | Domain 3 §1 |
| 2.3 | **Create `useReadingPreferences` hook** | 🛠️ | Font size (mobile 18px / desktop 19px), line height (1.6), stored in localStorage | Domain 3 §1 |
| 2.4 | **Build theme switcher UI** | 🛠️ | Three toggle buttons or segmented control in Settings panel | Domain 3 §1 |

### 2B — Typographic Scale Constants

| Property | Mobile (<768px) | Desktop (≥768px) |
|----------|-----------------|-------------------|
| Base font size | 18px | 19px |
| Line height | 1.6 (28.8px) | 1.6 (30.4px) |
| Max line length | 650px (~70 chars) | 650px (~70 chars) |
| Hit targets | ≥44×44px | ≥44×44px |

### 2C — Color Mode Tokens

| Token | Light Mode | Sepia Mode | Dark Mode |
|-------|-----------|------------|-----------|
| `--color-bg` | `#FFFFFF` | `#F5ECD7` | `#000000` |
| `--color-text` | `#1C1C1E` | `#3B2F1E` | `#E5E5E0` |
| `--color-text-secondary` | `#636366` | `#6B5B42` | `#98989D` |
| `--color-surface` | `#F2F2F7` | `#EDE3CC` | `#1C1C1E` |
| `--color-accent` | `#0057B3` | `#8B5E3C` | `#64A6FF` |
| `--color-border` | `#D1D1D6` | `#D4C9AF` | `#38383A` |

### 2D — Components

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 2.5 | **Build `<ReadingView>`** | 🛠️ | Virtualized list via `@tanstack/react-virtual` — renders only visible verse rows + buffer (overscan 5) | Architecture §3 |
| 2.6 | **Build `<VerseRow>`** | 🛠️ | Single verse: verse number + text body, wrapped in Radix ContextMenu trigger; min 44px height | Domain 3 §1, §3 |
| 2.7 | **Build `<TranslationToggle>`** | 🛠️ | Toggle between loaded translations; side-by-side mode locks synchronized scroll via IntersectionObserver | Domain 1 §8 |
| 2.8 | **Build mobile layout shell** | 🛠️ | Single-column stream, fixed top header (Book-Chp selector, Settings gear), bottom sheets for secondary views | Domain 3 §2 |
| 2.9 | **Build desktop 3-pane layout** | 🛠️ | `grid-cols-[20%_50%_30%] h-screen overflow-hidden` — left: nav tree, center: reading, right: dock | Domain 3 §2 |
| 2.10 | **Build `<BookChapterNav>`** | 🛠️ | Hierarchical tree: book group → book → chapter; independent scroll via `overflow-y-auto` | Domain 3 §2 |
| 2.11 | **Build `<SettingsPanel>`** | 🛠️ | Color mode toggle, font size stepper, translation checkboxes | Domain 3 §1 |
| 2.12 | **Build responsive shell wrapper** | 🛠️ | Adaptive component that renders mobile or desktop layout based on viewport width | Domain 3 §2 |

### 2E — Verification

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 2.13 | **Verify reading experience** | 🧪 | Scroll John 1 with virtualization, switch translations, test all 3 color modes, test at 375px and 1200px | Domain 3 §1-2 |

---

## Phase 3: Navigation & Cross-References (~3 days)

**Goal:** Implement graph navigation — cross-reference overlays, immutable position back-stack.

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 3.1 | **Create `useNavigationStack`** | 🛠️ | Context + hook: `Array<{ verseId, scrollOffset, timestamp }>`, push/pop/peek/clear | Architecture §3, Domain 1 §3 |
| 3.2 | **Build cross-ref overlay (mobile)** | 🛠️ | Bottom sheet at 60% height, kinetic slide-up via `transform: translateY(0)` + `opacity: 1`, backdrop locks main scroll | Domain 3 §2, §4 |
| 3.3 | **Build cross-ref panel (desktop)** | 🛠️ | Right-panel dock renders cross-ref list; side-by-side with reading view | Domain 3 §2 |
| 3.4 | **Wire cross-ref tap → navigation** | 🛠️ | Tap cross-ref → push current (verseId, scrollOffset) to stack → scroll to target → "Back" pops and restores exact position | Domain 1 §3 |
| 3.5 | **Build `<HistoryBreadcrumb>`** | 🛠️ | Shows last 3-5 positions with book/chapter/verse labels; tap to jump back | Domain 1 §3 |
| 3.6 | **Test deep navigation chains** | 🧪 | Follow 5+ cross-ref hops, verify back returns to exact pixel position each time | Domain 1 §3 |

**Animation spec for bottom sheets:**
- Enter: `transform: translateY(100%) → translateY(0)`, `opacity: 0 → 1`, 200ms ease-out
- Exit: reverse, 150ms ease-in (exit faster than enter per UI/UX §7)
- Backdrop: `opacity: 0 → 0.5`, pointer-events: auto
- Never animate `height`, `top`, `bottom` — only `transform` and `opacity` (anti-layout-shift directive)

---

## Phase 4: Context Menu & Gestures (~2 days)

**Goal:** Implement right-click (desktop) and long-press (mobile) context menus per Domain 3 §3.

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 4.1 | **Build `<VerseContextMenu>` (desktop)** | 🛠️ | Radix ContextMenu — triggered on `<VerseRow>` right-click; option: "Contrast Perspectives" | Domain 3 §3 |
| 4.2 | **Build long-press handler (mobile)** | 🛠️ | `onPointerDown` with 500ms timer → haptic feedback (Vibration API or Tauri plugin) → summon drawer with same options | Domain 3 §3 |
| 4.3 | **Wire context menu → AI processing** | 🛠️ | Selected verse ID passes to AI state container; triggers prompt assembly | Domain 3 §3 |
| 4.4 | **Test both input methods** | 🧪 | Desktop right-click, mobile long-press (Chrome DevTools touch emulation) | Domain 3 §3 |

---

## Phase 5: BYOK & AI Integration (~5 days)

**Goal:** Build the Bring-Your-Own-Key setup, two-mode AI engine, cache-first execution, graceful degradation.

### 5A — Key Management

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 5.1 | **Build BYOK onboarding UI** | 🛠️ | Fallback "AI Integration Gateway" — non-technical instructions, password-masked input, "Clear/Revoke Token" button | Domain 3 §5 |
| 5.2 | **Create `useAiKey` hook** | 🛠️ | Store API key via `@tauri-apps/plugin-store` (encrypted); retrieve for HTTP requests | Architecture §1 |

### 5B — AI Engine

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 5.3 | **Build Mode 1: Strict Interpretation prompt** | 🛠️ | System prompt: "You are a biblical linguistics specialist. Answer only from the provided translation text. Analyze Koine Greek morphology, Biblical Hebrew syntax, and semantic roots. If the query cannot be answered from the text, respond with: 'This query falls outside the text-only analysis mandate.'" | Domain 1 §2 |
| 5.4 | **Build Mode 2: Historical Research prompt** | 🛠️ | System prompt: "You are a historical biblical scholar. Provide socio-cultural context, ancient Near Eastern / Greco-Roman customs, author conditions, and audience analysis. Attribute all claims to verified sources." | Domain 1 §2 |
| 5.5 | **Add mode toggle UI** | 🛠️ | Clear switch in AI panel — "Text-Strict" vs "Historical Research" with active indicator | Domain 1 §8 |

### 5C — Network & Cache

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 5.6 | **Build `<AiPanel>`** | 🛠️ | Right-pane / bottom-sheet display: response text, mode indicator, loading skeleton, error state | Domain 1 §2 |
| 5.7 | **Implement cache-first execution** | 🛠️ | 1. Check `ai_commentary_cache` → 2. If valid, render immediately → 3. Else fire HTTP → 4. Save to cache + render simultaneously | Architecture §5 |
| 5.8 | **Implement `useNetworkState` hook** | 🛠️ | Global `navigator.onLine` + `online`/`offline` events → disable AI buttons, show polished offline warning | Architecture §5 |
| 5.9 | **Build native HTTP router in Rust** | 🛠️ | `src-tauri/src/commands/ai.rs` — attach user API key, POST to Google AI Studio, stream response via IPC channel | Architecture §4 |

### 5D — Verification

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 5.10 | **Test AI pipeline** | 🧪 | Mode 1: "Parse JHN.1.1 in Greek" → text-only response. Mode 2: "Historical context of John" → sourced response. Offline → buttons disabled gracefully | Domain 1 §2, Architecture §5 |

---

## Phase 6: User Data & Persistence (~3 days)

**Goal:** Bookmarks, notes, and cross-device cloud sync.

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 6.1 | **Build bookmark UI** | 🛠️ | Star icon on `<VerseRow>` hover/tap; bookmark list panel (right pane / bottom sheet) | Architecture §2 |
| 6.2 | **Build notes UI** | 🛠️ | Tap note icon → inline textarea tied to verse ID; auto-saved on blur or 2s debounce | Architecture §2 |
| 6.3 | **Implement encrypted local export** | 🛠️ | Export bookmarks + notes as AES-encrypted JSON blob to user-chosen path via Tauri dialog | Domain 1 §2 |
| 6.4 | **Implement cloud sync passthrough** | 🛠️ | User connects Google Drive/OneDrive OAuth via Tauri's `shell->open` for auth URL + native file picker for sync file; app reads/writes encrypted snapshot | Domain 1 §2 |
| 6.5 | **Test data persistence** | 🧪 | Add bookmarks, write notes, close app, reopen — data intact | Domain 1 §2 |

---

## Phase 7: Polish, Animations & Performance (~3 days)

**Goal:** Hardware-accelerated animations, performance optimization, accessibility audit.

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 7.1 | **Add hardware-accelerated transitions** | 🛠️ | Bottom sheets: `transform: translateY()` + `opacity`, 200ms ease-out. Panel slide-ins, overlay fades. **No animating width/height/top/left** | Domain 3 §4, UI/UX §7 |
| 7.2 | **Add haptic feedback** | 🛠️ | Long-press activation and bookmark toggle → Vibration API (`navigator.vibrate(10)`) | Domain 3 §3 |
| 7.3 | **Implement reduced-motion** | 🛠️ | `@media (prefers-reduced-motion: reduce)` → disable all non-essential animations, fade transitions to 0ms | UI/UX §1, §7 |
| 7.4 | **Performance audit** | 🧪 | React DevTools profiler on virtualized scroll (verify ≤16ms frame budget); Lighthouse CLS < 0.1; no forced reflows | Architecture §3, UI/UX §3 |
| 7.5 | **Accessibility audit** | 🧪 | Full keyboard nav, `aria-label` on icon buttons, 4.5:1 contrast in all 3 color modes, visible focus rings (2-4px), correct heading hierarchy | UI/UX §1 |
| 7.6 | **Cross-platform test** | 🧪 | Windows desktop test + Android emulator test; verify 375px mobile and 1440px desktop | DevOps §6 |

---

## Phase 8: Build, Package & Deploy (~2 days)

**Goal:** Production builds, security hardening, installer generation.

| # | Task | Type | Details | Spec Ref |
|---|------|------|---------|----------|
| 8.1 | **Harden CSP for production** | 🔒 | Replace `null` CSP with: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://generativelanguage.googleapis.com; img-src 'self' data:;` | DevOps |
| 8.2 | **Full type check** | 🧪 | `tsc --noEmit` — **zero** type errors required | DevOps §6 |
| 8.3 | **Full lint** | 🧪 | `pnpm run lint` — **zero** warnings | DevOps §6 |
| 8.4 | **Build Windows installer** | 🛠️ | `pnpm tauri build` → `.msi` / `.exe` in `src-tauri/target/release/bundle/msi/` — verify ≤15MB | DevOps §6 |
| 8.5 | **Build Android APK** | 🛠️ | `pnpm tauri android build` → release `.apk` / `.aab` — verify packaging | DevOps §6 |
| 8.6 | **Pre-release integrity checklist** | 🧪 | Verify: offline reading, parallel translations, AI mode switch, BYOK flow, back-stack nav, <15MB footprint | Domain 1 §8, DevOps §6 |

---

## Future Considerations (Post-Launch)

| Area | Notes |
|------|-------|
| **Scripture data expansion** | Add remaining books via incremental seed files; consider loading per-testament to stay under 15MB |
| **iOS build** | Requires macOS + Xcode; `pnpm tauri ios build` (Tauri v2 supports iOS) |
| **Custom reading font** | Load a serif font like Literata or Source Serif 4 via `@fontsource` for the reading pane — enhances typographic immersion |
| **Search** | Full-text search across all translations via SQLite FTS5 virtual tables |
| **Strong's Concordance** | Integrate Strong's numbers for original language word study |
| **Reading plans** | Daily reading plan feature with progress tracking |
| **User feedback** | In-app "Report issue" → GitHub issues via `tauri-plugin-shell` `open` |

---

## Dependency Installation Reference

```bash
# From project root (already has most deps — only missing ones below)
pnpm add @radix-ui/react-context-menu @tanstack/react-virtual lucide-react clsx
pnpm add -D @tailwindcss/vite
```

---

## UI/UX Design Guidelines Incorporated

This plan adheres to the `ui-ux-pro-max` skill rules throughout:

| Priority | Rule | Applied In |
|----------|------|------------|
| Critical | Touch targets ≥44×44px | Phase 2 (VerseRow, all interactive elements) |
| Critical | Contrast ≥4.5:1 | Phase 2 (color tokens verified for all 3 modes) |
| Critical | Keyboard nav + focus rings | Phase 7 (accessibility audit) |
| High | Virtualize lists (50+ items) | Phase 2 (ReadingView with @tanstack/react-virtual) |
| High | No horizontal scroll | Phase 2 (responsive layout, 650px max-width) |
| High | Mobile-first breakpoints | Phase 2 (768px breakpoint, adaptive shell) |
| Medium | Transform/opacity only animations | Phase 3, 7 (bottom sheets, panels) |
| Medium | 150-300ms micro-interactions | Phase 3, 7 (200ms ease-out for all transitions) |
| Medium | SVG icons (no emoji) | Phase 0 (lucide-react, consistent stroke-based) |
| Medium | Semantic color tokens | Phase 2 (CSS custom properties, not raw hex) |
| Medium | Reduced-motion support | Phase 7 (prefers-reduced-motion) |
| High | Exit faster than enter (60-70%) | Phase 3 (150ms exit vs 200ms enter) |
| Medium | Visible load states <300ms → skeleton | Phase 5 (AI panel loading skeleton) |

---

## Startup Sequence (First Cold Boot)

```
[ App Launch ]
      |
      v
[ Tauri setup() ]
      |
      v
[ DB: Check refbible.db exists ]
      |
      ├── Yes → Open connection, load schema version
      |
      └── No  → Create file, execute DDL, run seed INSERTs
                    |
                    v
              [ Seed: John 1 (KJV + NASB) ]
                    |
                    v
              [ Write success ] → [ Open connection ]
      |
      v
[ Frontend mount ]
      |
      v
[ Check localStorage: theme, prefs, API key ]
      |
      v
[ DB query: get_verses(43, 1) ]
      |
      v
[ Virtualize + render reading view ]
```

---

## Tauri IPC Architecture

```
[ React Frontend ]                    [ Rust Backend ]
        |                                    |
        |── invoke("get_verses", ...) ──────>│
        │                                    │── SQLite query
        │<── serialized Verse[] ─────────────│
        |                                    |
        |── invoke("ai_query", ...) ────────>│
        │                                    │── Attach API key from store
        │                                    │── HTTP POST to Google AI Studio
        │<── stream response ────────────────│
        |                                    |
        |── invoke("save_note", ...) ───────>│
        │                                    │── SQLite INSERT
        │<── success ────────────────────────│
```

---

*End of plan. This document should be updated as implementation progresses and decisions evolve.*
