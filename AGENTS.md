# RefBible — AI Agent Instructions

## Project Identity

RefBible is an ultra-lightweight, cross-platform **Scripture research application** (Windows/Android/iOS). It treats text as a fluid, multi-dimensional relational network — prioritizing typographic reading immersion and deep theological analysis over layout bloat.

**Core mission:** Transform Scripture reading by enabling frictionless graph-based navigation, offline-first operation, zero-cost scaling, and AI-powered linguistic/historical analysis powered by the user's own API key.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Desktop/Mobile Shell** | Tauri v2 (Rust) | Compiles to native Windows, Android, iOS |
| **Frontend** | React 19 + TypeScript 6 | Strict mode, functional components only |
| **Bundler** | Vite 8 | React plugin via `@vitejs/plugin-react` |
| **Styling** | Tailwind CSS v4 | Via `@tailwindcss/vite` plugin |
| **Typography** | `@tailwindcss/typography` | Prose plugin for reading view |
| **Database** | SQLite via `@tauri-apps/plugin-sql` | Offline-first, local `.db` file |
| **HTTP** | `@tauri-apps/plugin-http` | Native HTTP (bypasses browser CORS) |
| **Virtualization** | `@tanstack/react-virtual` | Reading list rendering |
| **Context Menus** | `@radix-ui/react-context-menu` | Right-click / long-press menus |
| **Icons** | `lucide-react` | SVG icons only — no emoji as icons |
| **Utilities** | `clsx` | Conditional class merging |

**Allowed external packages. Do NOT install any package not in this table or in the plan without explicit justification and approval.**

---

## Key Commands

```bash
pnpm dev              # Start Vite dev server
pnpm build            # TypeScript check + Vite production build
pnpm lint             # ESLint on all source
pnpm preview          # Preview production build
pnpm tauri dev        # Boot Vite + compile Tauri in debug mode
pnpm tauri build      # Production bundle -> installer
tsc --noEmit          # TypeScript type-check only
```

---

## Project Structure

```
refbible/
├── docs/PLAN.md              # Full implementation plan
├── AGENTS.md                 # THIS FILE — AI context
├── index.html                # Vite entry
├── package.json
├── vite.config.ts
├── tsconfig.json / .app / .node
├── eslint.config.js
├── public/
│   └── favicon.svg, icons.svg
├── src/
│   ├── main.tsx              # React entry point
│   ├── index.css             # Global styles + Tailwind import + design tokens
│   ├── App.tsx               # Root layout (mobile/desktop adaptive shell)
│   ├── components/           # UI components
│   │   ├── layout/           # AppShell, Header, Navigation
│   │   ├── reading/          # ReadingView, VerseRow, TranslationToggle
│   │   ├── panels/           # SettingsPanel, AiPanel, CrossRefPanel
│   │   ├── sheets/           # BottomSheet (mobile overlays)
│   │   └── ui/               # Primitive components (Button, Icon, etc.)
│   ├── hooks/                # Custom React hooks
│   │   ├── useTheme.ts
│   │   ├── useNavigationStack.ts
│   │   ├── useNetworkState.ts
│   │   ├── useReadingPreferences.ts
│   │   └── useAiKey.ts
│   ├── contexts/             # React Context providers
│   │   ├── ThemeContext.tsx
│   │   └── NavigationContext.tsx
│   ├── lib/                  # Utility modules
│   │   ├── db.ts             # Frontend DB bridge (typed SQLite wrappers)
│   │   ├── ai.ts             # AI prompt builders + cache orchestration
│   │   └── utils.ts          # General utilities
│   ├── types/                # TypeScript type definitions
│   │   └── db.ts             # Verse, ContentText, CrossReference, Bookmark, Note, AiCache
│   └── assets/               # Static images
├── src-tauri/
│   ├── src/
│   │   ├── main.rs           # Rust entry (calls app_lib::run)
│   │   ├── lib.rs            # Tauri builder: plugins, setup, commands
│   │   ├── db.rs             # DB init, migration, seed
│   │   ├── seed.rs           # Seed data (John 1 KJV+NASB)
│   │   └── commands/
│   │       ├── mod.rs        # Module declarations
│   │       ├── verses.rs     # get_verses, get_translations
│   │       ├── refs.rs       # get_cross_references
│   │       ├── user.rs       # bookmarks, notes CRUD
│   │       ├── ai.rs         # HTTP router to Google AI Studio
│   │       └── cache.rs      # ai_commentary_cache read/write
│   ├── capabilities/default.json
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   └── Cargo.lock
```

---

## Database Schema (SQLite)

6 tables — all created via `CREATE TABLE IF NOT EXISTS` on first cold boot:

### `verses`
```sql
CREATE TABLE IF NOT EXISTS verses (
  id TEXT PRIMARY KEY,          -- "JHN.1.1"
  book_id INTEGER NOT NULL,
  chapter_num INTEGER NOT NULL,
  verse_num INTEGER NOT NULL
);
```

### `content_text`
```sql
CREATE TABLE IF NOT EXISTS content_text (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL REFERENCES verses(id),
  translation_code TEXT NOT NULL,  -- "KJV", "NASB"
  text_data TEXT NOT NULL
);
```

### `cross_references`
```sql
CREATE TABLE IF NOT EXISTS cross_references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origin_verse_id TEXT NOT NULL REFERENCES verses(id),
  target_verse_id TEXT NOT NULL REFERENCES verses(id),
  thematic_weight INTEGER DEFAULT 0
);
```

### `bookmarks`
```sql
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL REFERENCES verses(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `notes`
```sql
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL REFERENCES verses(id),
  text_content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `ai_commentary_cache`
```sql
CREATE TABLE IF NOT EXISTS ai_commentary_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id TEXT NOT NULL,
  query_mode TEXT NOT NULL,       -- 'strict' | 'research'
  cached_response TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## CODING CONVENTIONS

### TypeScript & React
- **Functional components only** — no class components
- **Strict TypeScript** — no `any`, no `// @ts-ignore`, no `as` casts unless unavoidable
- **Named exports** — use `export function Foo()` over `export default`
- **Props interface** — define as `interface FooProps` colocated with the component file
- **Hooks** — `use` prefix, one hook per concern, extract complex logic from components
- **State management** — React Context for global state (theme, nav stack), local `useState` for component state. No external state library.
- **Async** — `async/await` everywhere. No raw `.then()` chains.
- **No prop drilling >2 levels** — if a prop passes through 2+ intermediate components, use Context or composition

### Styling (Tailwind CSS v4)
- **Utility classes** — prefer Tailwind utilities over custom CSS
- **Custom CSS** — only for design tokens (`@theme`), animations, and complex responsive patterns
- **Design tokens** — defined as CSS custom properties in `index.css`, referenced in Tailwind config `@theme`
- **Color modes** — via `data-theme="light|sepia|dark"` on `<html>`, tokens switch automatically
- **No inline styles** — exception only for dynamic transform values that can't be expressed as classes

### Icons
- **SVG only** — use `lucide-react` (never emoji as icons)
- **Consistent sizing** — `size={16|20|24}` via Lucide props
- **Stroke consistency** — all within same visual layer: 1.5px or 2px

### Animations (CRITICAL RULES)
- **NEVER animate `width`, `height`, `top`, `bottom`, `margin`, `padding`** — these trigger layout reflow (CLS)
- **ALWAYS use `transform` and `opacity`** for motion — these are GPU-composited
- **Duration:** 200ms ease-out for enters, 150ms ease-in for exits
- **Respect `prefers-reduced-motion`** — disable non-essential animations
- **Bottom sheets:** `transform: translateY(100%) → translateY(0)` + `opacity: 0 → 1`

### Accessibility
- **Touch targets minimum:** 44×44px (extend via padding if icon is smaller)
- **Contrast:** ≥4.5:1 for all text in all 3 color modes
- **Focus rings:** 2-4px visible focus on all interactive elements
- **Alt text:** descriptive `alt` for meaningful images, `aria-label` for icon-only buttons
- **Keyboard nav:** tab order matches visual order, full keyboard support

---

## ANTI-HALLUCINATION RULES (MANDATORY)

These rules exist because AI agents frequently invent things that don't exist. Follow them strictly.

### Rule AH-1: Never Invent APIs
- **Do not call any function, method, or API unless you have read its actual source code or official documentation** in this project or a trusted standard library.
- If you want to use a Tauri API, first search the project for existing usage. If none exists, check the installed `node_modules` or the Cargo.lock to verify it's available.
- **Never assume a function exists** because it seems logical. You must verify it exists by searching the codebase.

### Rule AH-2: Never Invent Configuration Keys
- **Do not add keys to `tauri.conf.json`, `vite.config.ts`, `tsconfig.json`, or `Cargo.toml`** unless you have verified those keys are valid in the respective tool's documentation.
- Never add `"permissions"` to Tauri capabilities that aren't in the `node_modules/@tauri-apps/api` or verified in Tauri docs.

### Rule AH-3: Never Invent CSS Classes or Tailwind Variants
- **Do not use a Tailwind class unless you know it exists.** Tailwind v4 has changed/removed some v3 classes. If unsure, check `node_modules/tailwindcss`.
- Do not invent custom `data-*` selectors or `@theme` keys unless they're defined in `index.css`.
- Do not use `@apply` — Tailwind v4 discourages it in favor of utility composition.

### Rule AH-4: Never Invent TypeScript Types
- All database types are defined in `src/types/db.ts`. Do not redefine them elsewhere. Import them.
- Do not invent generic argument patterns or type utilities that aren't already used in the project.

### Rule AH-5: Never Invent Dependencies
- **Do not add any package to `package.json` or `Cargo.toml`** that isn't in the Tech Stack table above or explicitly listed in `docs/PLAN.md`.
- If you believe a new dependency is necessary, you must state the exact package name, version, and a one-sentence justification before adding it.
- This includes: npm packages, Cargo crates, Tauri plugins, and any other third-party code.

### Rule AH-6: Never Simulate — Check
- Before writing code that uses a Browser API, Tauri API, or React API, verify the API signature exists by checking actual source files.
- Do not generate "example" or "placeholder" code that references non-existent functions.
- If you are unsure whether a feature exists, search the codebase first.

---

## REDUNDANCY PREVENTION

### Rule RP-1: Read Before Writing
- Before creating a new file, check if a file with that name or purpose already exists.
- Before writing a utility function, check `src/lib/utils.ts` and all existing hooks.
- Before adding a type, check `src/types/` for existing type definitions.

### Rule RP-2: Reuse Existing Patterns
- When adding a new component, look at existing components in the same directory first. Mirror their structure, imports, export pattern, and styling approach.
- When adding a new Rust command, mirror the existing command patterns in `src-tauri/src/commands/`.
- When adding a new hook, mirror the pattern in existing hooks (same folder, same export style, same linting setup).

### Rule RP-3: DRY (Don't Repeat Yourself)
- If the same inline Tailwind utility combination appears more than twice, extract it into a reusable component or a shared className utility.
- If the same SQL query pattern appears in multiple Rust commands, extract it into a helper function in `db.rs`.
- If the same type annotation appears in multiple files, move it to `src/types/`.

### Rule RP-4: No Dead Code
- Remove unused imports immediately. Do not leave commented-out code as "documentation."
- If a function or component is not exported and not used within its file, delete it.
- Do not leave `console.log` statements in committed code.
- Do not create "wrapper" components that add no behavior or styling.

### Rule RP-5: Component Granularity
- A component file should do one thing. If a file exceeds 200 lines, consider splitting.
- Do not create a separate file for a component used in only one place unless it exceeds 50 lines of logic.
- Keep helper/utility functions in `lib/`, not inside component files.

---

## SCOPE CONTROL

### Rule SC-1: Stay Within the Task
- Only implement what you are asked to implement. Do not add "bonus" features, extra UI polish, or "while I'm here" refactors.
- If you see an opportunity for improvement outside the current task, note it in a comment and move on. Do not implement it.

### Rule SC-2: Don't Over-Engineer
- Use the simplest React pattern that works: `useState` before `useReducer`, local state before Context, simple functions before custom hooks.
- Do not add loading states, error boundaries, or empty states for components unless the spec or plan explicitly requires them.
- Do not add animation or transitional effects beyond what the spec defines.
- Do not pre-optimize. Build for correctness first, profile before optimizing.

### Rule SC-3: Don't Refactor What You Aren't Touching
- If a file compiles and works, do not reformat it, rename its exports, or restructure its internals — even if it doesn't match your preferred style.
- Do not change import style, type style, or naming conventions in existing files.
- If the linter enforces a rule and the existing code violates it, fix only the lines you are modifying, not the entire file.

### Rule SC-4: Each Task Has a Single Deliverable
- A single task = a single component, a single hook, a single command, or a single schema change.
- Do not bundle unrelated changes into one request or one commit.

---

## CODE QUALITY GATES

### Gate CQ-1: Before Writing Code
- [ ] Have I read the relevant existing files to understand conventions?
- [ ] Have I checked if this functionality already exists?
- [ ] Am I adding any dependency? (If yes, see AH-5.)
- [ ] Am I inventing any API call? (If yes, see AH-1.)
- [ ] Does this task have a spec or plan reference? Follow it exactly.

### Gate CQ-2: While Writing Code
- [ ] Am I using the project's existing patterns and conventions?
- [ ] Is my code as simple as possible for this task?
- [ ] Am I staying within the scope of the task (SC-1)?
- [ ] Am I avoiding dead code, unused imports, and console.log (RP-4)?
- [ ] Am I avoiding layout-shifting animations (use transform/opacity only)?

### Gate CQ-3: Before Submitting Code
- [ ] Does `tsc --noEmit` pass with zero errors?
- [ ] Does `pnpm run lint` pass with zero warnings?
- [ ] Have I removed all `console.log` statements?
- [ ] Have I removed all commented-out code?
- [ ] Have I removed all unused imports?
- [ ] Have I checked that I didn't add any packages (AH-5)?
- [ ] Have I checked that I didn't invent any APIs (AH-1)?
- [ ] Does `pnpm run build` succeed?
- [ ] Is the code limited to exactly what was asked (SC-1)?

---

## ANTI-PATTERNS (NEVER DO THESE)

| Anti-Pattern | Why | Instead |
|-------------|-----|---------|
| Animating `width`/`height`/`top`/`left` | Causes layout reflow (CLS spikes) | Use `transform` + `opacity` |
| Using `any` type | Bypasses TypeScript safety | Define proper types or use `unknown` with narrowing |
| `// @ts-ignore` or `// @ts-expect-error` | Silences real errors | Fix the underlying type issue |
| Emoji as icons (`⚙️`, `📖`, `🔍`) | Inconsistent across platforms, no styling control | Use `lucide-react` SVG icons |
| `fetch()` in frontend for AI calls | Blocked by CORS, exposes API key to browser | Use Tauri IPC → Rust `@tauri-apps/plugin-http` |
| Adding state management library (Redux, Zustand, Jotai) | Overkill for this app's complexity | React Context + `useState` |
| Using `var` or `let` when `const` works | `let` signals reassignment | Prefer `const`, use `let` only when rebinding |
| Template literal `className` strings | Hard to maintain, error-prone | Use `clsx()` for conditional classes |
| Inline `style={{ transform: ... }}` | Bypasses Tailwind's design system | Use Tailwind utilities; only inline for truly dynamic GPU-composited values |
| Default exports | Rename hazards on import | Named exports for predictability |
| Nested ternary expressions | Hard to read | Extract into variables or early returns |
| Magic numbers/strings | Unknown meaning, hard to change | Extract to named constants |
| `useEffect` for derived state | Extra render, harder to debug | Compute derived values during render |
| Creating files outside the established structure | Disorganization | Follow the directory tree above |
| Adding npm/cargo packages without justification | Bloat, security risk | Must be explicitly justified (AH-5) |

---

## Important Architectural Rules

1. **Zero-cost scaling** — no backend servers, no API subscriptions paid by the developer. All AI costs are the user's via their own API key (BYOK).
2. **Offline-first** — core reading, navigation, bookmarks, and notes work 100% offline. AI features degrade gracefully.
3. **Cache-first AI** — before hitting the network, check `ai_commentary_cache`. If a valid record exists, return it immediately. Skip network entirely.
4. **No auth** — no login/signup. All data is anonymous and local. Cloud sync is user-configured (Google Drive / OneDrive passthrough).
5. **Two AI modes** — `strict` (locked to translation text, linguistic analysis only, refuse extrapolation) vs `research` (historical context, attributed sources). Toggle is a clear UI control.
6. **Immutable back-stack** — cross-reference navigation pushes to a stack. "Back" restores exact scroll position. Never silently reset the stack.
7. **Adaptive layout** — single-column with bottom sheets on mobile (<768px), 3-pane grid on desktop (≥768px).
8. **Hardware-accelerated overlays** — secondary views never navigate the page. They overlay via sliding sheets (mobile) or side panels (desktop).
9. **Under 15MB installer** — every line of code must justify its byte cost. No heavy libraries, no bundled assets over 500KB.

---

## Design Tokens (Color Modes)

| Token | Light (`#FFFFFF`) | Sepia (`#F5ECD7`) | Dark (`#000000`) |
|-------|-------------------|-------------------|-------------------|
| Text primary | `#1C1C1E` | `#3B2F1E` | `#E5E5E0` |
| Text secondary | `#636366` | `#6B5B42` | `#98989D` |
| Surface | `#F2F2F7` | `#EDE3CC` | `#1C1C1E` |
| Accent | `#0057B3` | `#8B5E3C` | `#64A6FF` |
| Border | `#D1D1D6` | `#D4C9AF` | `#38383A` |

---

## Typographic Constants

| Breakpoint | Font Size | Line Height | Leading | Max Width |
|-----------|-----------|-------------|---------|-----------|
| Mobile (<768px) | 18px | 1.6 | 28.8px | 650px |
| Desktop (≥768px) | 19px | 1.6 | 30.4px | 650px |

---

## IPC Architecture (React ↔ Rust)

```
Frontend (React)                    Backend (Rust/SQLite)
     │                                    │
     │── invoke("get_verses", ...) ──────>│
     │                                    │── SQLite SELECT
     │<── serialized Verse[] ─────────────│
     │                                    │
     │── invoke("save_note", ...) ───────>│
     │                                    │── SQLite INSERT
     │<── success ────────────────────────│
     │                                    │
     │── invoke("ai_query", ...) ────────>│
     │                                    │── Attach API key
     │                                    │── HTTP POST → Google AI Studio
     │<── stream response ────────────────│
```

All DB reads/writes go through Tauri IPC. React never touches the filesystem directly.

---

## First Cold Boot Sequence

```
[ App Launch ]
      ↓
[ Tauri setup() ]
      ↓
[ DB exists? ]
  ├── Yes → Open connection
  └── No  → Create file, run DDL, seed John 1 (KJV+NASB)
              ↓
            [ Open connection ]
      ↓
[ Frontend mount ]
      ↓
[ Read localStorage: theme, prefs, API key ]
      ↓
[ DB query: get_verses(book_id, chapter) ]
      ↓
[ Virtualize + render ]
```

---

## Performance Requirements

- **Under 15MB** installer footprint
- **60fps** scrolling — verified via React DevTools profiler
- **CLS < 0.1** — no layout shift during loading
- **Input latency < 100ms** — visual feedback within 100ms of tap
- **Virtualize all lists** with 50+ items
- **No layout thrashing** — batch DOM reads before writes

---

## Cargo.toml (Base Dependencies)

```toml
[dependencies]
serde_json = "1.0"
serde = { version = "1.0", features = ["derive"] }
log = "0.4"
tauri = { version = "2", features = [] }
tauri-plugin-log = "2"
tauri-plugin-sql = "2"
tauri-plugin-http = "2"
```

**Do not add dependencies not listed in the spec or plan without justification.**

---

## Verification Before Commit (MANDATORY)

Run ALL of these before every commit:

```bash
pnpm run lint          # Zero warnings
tsc --noEmit           # Zero type errors
pnpm run build         # Production build succeeds
```

If any of these fail, fix the issues before proceeding.

---

*This file is the authoritative reference for AI agents working on RefBible. If you are an AI agent, read this file first before making any changes. If you are unsure about any rule, default to the most conservative interpretation.*
