# StarPoint — Agent Context

## Project Overview

**StarPoint** is a mobile-first PWA for managing padel tennis matches, mixing events, and ELO-based player rankings.
Tagline: _"La app de Padel & Risas"_
Version: 0.3.0 — active development.
Language of UI and most business logic: **Spanish**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.1 (App Router) |
| Language | TypeScript 5 (strict) |
| Runtime | React 19 |
| UI Library | Shadcn/ui (new-york style, Radix UI primitives) |
| Styling | TailwindCSS 4 + PostCSS |
| Icons | Lucide React |
| Forms | react-hook-form 7 + Zod 4 |
| Toasts | Sonner |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (SSR pattern) |
| Date utils | date-fns 4 |
| Theme | next-themes |

---

## Repository Structure

```
star-point/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Landing: redirects to /login or /dashboard
│   │   ├── layout.tsx            # Root layout
│   │   ├── home-client.tsx       # Animated home screen
│   │   ├── login/                # Login + register tabs
│   │   ├── dashboard/            # Main hub (matches, events, stats)
│   │   ├── profile/              # User profile settings
│   │   ├── history/              # Match history with filters
│   │   ├── events/[id]/          # Event detail pages
│   │   ├── reset-password/       # Password reset flow
│   │   ├── admin/events/[id]/generate/  # Admin: mixing round generator
│   │   └── actions/              # Server Actions (mutations)
│   │       ├── matches.ts        # confirmMatch, createMatch, updateMatch
│   │       ├── events.ts         # getOpenEvents, createEvent, join/leave/close
│   │       ├── mixing-generator.ts  # getEventMixingData, saveRoundMatches
│   │       ├── admin-matches.ts  # Admin match CRUD
│   │       ├── users.ts          # User profile ops
│   │       ├── dispute.ts        # Match dispute handling
│   │       └── debug-db.ts       # Debug utilities
│   ├── components/
│   │   ├── ui/                   # Shadcn primitives (16 components)
│   │   ├── layout/               # Footer
│   │   ├── dashboard/            # UserMenu, LevelCard, ViewToggle, MatchHistory
│   │   ├── events/               # CreateEventDialog, EditEventDialog, EventCard, ShareEventButton
│   │   ├── matches/
│   │   │   ├── dialogs/          # Match-related modals
│   │   │   ├── forms/            # Match forms
│   │   │   ├── lists/            # CreatedMatchesList, ValidationList
│   │   │   └── shared/           # Shared match utilities
│   │   └── profile/              # Profile components
│   ├── lib/
│   │   ├── config.ts             # Rating system constants
│   │   ├── rating-logic.ts       # ELO calculation engine
│   │   ├── mixing-algorithm.ts   # Auto-pairing algorithm
│   │   ├── match-utils.ts        # Score parsing utilities
│   │   └── utils.ts              # cn() and general helpers
│   ├── types/
│   │   ├── index.ts              # Profile, Match, Player
│   │   └── events.ts             # MixingEvent, EventParticipant
│   └── utils/supabase/
│       ├── client.ts             # Browser Supabase client
│       └── server.ts             # Server Supabase client (cookie-based)
├── public/                       # Static assets
├── next.config.ts
├── tsconfig.json                 # Path alias: @/* → ./src/*
├── components.json               # Shadcn config
└── supabase_migration_matches_event_id.sql
```

---

## Routing Map

| Route | Purpose | Auth |
|---|---|---|
| `/` | Redirects to `/login` or `/dashboard` | — |
| `/login` | Login / (disabled) register | No |
| `/reset-password` | Password reset | No |
| `/dashboard` | Main hub: matches, events, stats | Yes |
| `/profile` | Profile settings | Yes |
| `/history` | Filterable match history | Yes |
| `/events/[id]` | Event detail + participants | Yes |
| `/admin/events/[id]/generate` | Run mixing algorithm | Admin |

---

## Database Schema

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | = Supabase auth user ID |
| `full_name` | text | |
| `email` | text | |
| `avatar_url` | text | |
| `rating` | float | ELO 0–7, initial 3.5 |
| `role` | enum | `'player'` \| `'admin'` |
| `matches_played` | int | |
| `matches_won` | int | |
| `win_ratio` | float | 0–1 |
| `ranking` | int | |
| `gender` | enum | `'masculino'` \| `'femenino'` \| `'otro'` |
| `preferred_hand` | enum | `'diestro'` \| `'zurdo'` \| `'ambidiestro'` |
| `court_position` | enum | `'reves'` \| `'drive'` \| `'ambos'` |
| `updated_at` | timestamp | |

### `matches`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `creator_id` | UUID FK | → profiles |
| `match_type` | enum | `'standard'` \| `'mixing'` |
| `status` | enum | `'pending'` \| `'confirmed'` \| `'disputed'` |
| `event_id` | UUID FK | → events, nullable |
| `player_a1/a2/b1/b2` | UUIDs | Team A and B |
| `score_details` | text | e.g. `"6-4 6-2"` |
| `sets_a`, `sets_b` | int | |
| `rating_change` | float | |
| `court_number` | int | |
| `round_number` | int | |
| `last_updated_by` | text | |

### `events`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `title` | text | |
| `start_time` | timestamp | |
| `max_spots` | int | |
| `rounds` | int | |
| `duration_minutes` | int | |
| `status` | enum | `'open'` \| `'closed'` \| `'finished'` |
| `created_by` | UUID FK | → profiles |

### `event_participants`
| Column | Type |
|---|---|
| `event_id` | UUID FK |
| `user_id` | UUID FK → profiles |
| `joined_at` | timestamp |

### `rating_history`
| Column | Type |
|---|---|
| `player_id` | UUID FK |
| `match_id` | UUID FK |
| `rating_before` | float |
| `rating_after` | float |

---

## Auth Pattern

- Provider: Supabase Auth
- Session: SSR cookie-based (`@supabase/ssr`)
- Server client: `src/utils/supabase/server.ts` — `createServerClient()` with cookie helpers
- Browser client: `src/utils/supabase/client.ts` — `createBrowserClient()`
- Route protection: each page server component calls `supabase.auth.getUser()` and redirects to `/login` if unauthenticated
- Admin check: compare `profile.role === 'admin'`

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL        # Public Supabase API URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Public anon key (client-side)
SUPABASE_SERVICE_ROLE_KEY       # Admin key (server-side only, never expose)
```

---

## Rating System (ELO-based)

### Constants (`src/lib/config.ts`)
```ts
K_PROVISIONAL: 0.40      // High volatility — new players
K_ESTABLISHED: 0.15      // Stable — veterans
PROVISIONAL_LIMIT: 10    // Matches until established
DISPARITY_FULL: 1.0      // gap ≤ 1.0 → match counts 100%
DISPARITY_ZERO: 2.5      // gap ≥ 2.5 → match counts 0% (linear falloff between)
DAMPENING_START: 4.5     // volatility starts decreasing from here
DAMPENING_END: 6.5       // K bottoms out at 60% here
SCALE_DIVISOR: 3
MATCH_WEIGHT: 0.70       // raised from 0.40 on 2026-07-16, see "Rating tuning history" below
MIN_RATING: 0
MAX_RATING: 7
INITIAL_RATING: 3.5
BASE_SCORE_MULTIPLIER: 0.9
SCORE_RATIO_WEIGHT: 0.2
```

### Calculation flow (`src/lib/rating-logic.ts`)
1. Get 4 players' ratings + match counts
2. Assign K-factor (provisional vs established)
3. Parse score → intensity multiplier weighted by `MATCH_WEIGHT`
4. Apply disparity filter: linear falloff between `DISPARITY_FULL` and `DISPARITY_ZERO` team gap
5. Apply dampening for high-rated players between `DAMPENING_START` and `DAMPENING_END`
6. Clamp result to `[MIN_RATING, MAX_RATING]`
7. On confirmation: the Postgres RPC `confirm_match_atomic` is the **only** place that writes `profiles.rating`, `matches_played`, `matches_won`, `win_ratio` and inserts into `rating_history` — atomic transaction with a `FOR UPDATE` lock + `ALREADY_CONFIRMED` guard. If the match's event has `is_test = true`, this RPC writes nothing, which is how end-to-end tests avoid touching real rankings.

### Rating tuning history
- `MATCH_WEIGHT` was raised 0.40 → 0.70 on 2026-07-16 after ~3 weeks of real usage showed ratings barely differentiating players (stddev ~0.19 on a 0–7 scale after 9 matches/player) despite very different win/loss records. Candidates were compared by simulating both rating spread *and* actual pairing quality (running the real `generateMixingRound` hundreds of times per candidate), not just spread.
- The change was applied **retroactively** (recomputing all of `rating_history` in chronological order) via `src/scripts/retroactive-match-weight.ts` — a standalone script that imports the real `calculateNewRating`, dry-runs by default, and only writes with an explicit `--apply` flag. Kept committed as the reference pattern for any future retroactive rating-config change: simulate with real data → show the resulting listing to the user → apply only after explicit confirmation.

---

## Mixing Algorithm (`src/lib/mixing-algorithm.ts`)

Auto-pairs players for round-robin mixing events.

### Config options
- `genderMode` — balance genders or ignore
- `balanceStrategy` — rating-balanced vs random
- `avoidRepetition` — penalize past partners/opponents
- `forcePosition` — require Drive + Revés per court

### Flow per round
1. Sort participants by rating (with optional jitter)
2. Chunk into groups of 4 (one group = one court)
3. Try 3 team permutations per group:
   - Case A: (1st+2nd) vs (3rd+4th)
   - Case B: (1st+3rd) vs (2nd+4th) ← usually most balanced
   - Case C: (1st+4th) vs (2nd+3rd)
4. Score each permutation: rating balance + repetition penalties + position fit
5. Pick best → `MatchProposal`; leftovers noted

---

## Core User Flows

### Player
1. Login → see dashboard (stats, upcoming events, pending matches)
2. Join mixing event → wait for admin to generate rounds
3. Register match result (as creator)
4. Validate matches you participated in
5. Dispute incorrect results
6. View rating history and match history

### Admin
1. Create mixing event (title, date, max_spots, rounds)
2. Close registration → run mixing algorithm
3. Generate rounds → saves matches to DB
4. Edit/delete any match
5. View all pending matches and confirm them
6. Share event via WhatsApp-friendly text
7. Rename a guest player's display name (`renameGuest`, from `PlayerProfileDialog`), for easier identification when filling an event with guests
8. Rotate the 4 players of an **already-published** match when they agree to swap partners courtside (see "Rotate players in a published match" below)

### Match lifecycle
```
Created (pending) → Confirmed (ratings calculated) → Audit in rating_history
                 ↘ Disputed
```

### Rotate players in a published match
- Once an event's rounds are published (`saveAllRounds`, event → `in_progress`), players sometimes agree on-court to swap who partners whom in a given round/court. The player's decision takes priority even though it affects ELO.
- `rotateMatchPlayers(matchId)` in `src/app/actions/matches.ts`: admin-only, keeps `player_a1` fixed and cyclically rotates `a2 → b1 → b2 → a2` on the same `matches` row (never moves a player to a different court/match). One click = one rotation through the 3 possible pairings.
- Blocked when `status === 'confirmed'` or when `score_details !== '0-0'` (a result was already entered) — before that point nothing has been written to ELO yet, so it's safe.
- UI: a single 🔀 (`Shuffle` from lucide-react) icon on the existing match card in `ValidationList.tsx`, next to the court-name editor. **There is no dedicated screen for this** — an earlier design built a whole new admin page with a 2-player-click-to-select swap UI, which was scrapped in favor of the single-icon rotation because it's simpler and matches exactly how the interaction happens in real life (quick, in-situ, courtside). Lesson: before building a new screen/flow, check whether the desired outcome fits as a simpler interaction on the existing UI — especially when the user describes the interaction with a concrete step-by-step example (take it as literal spec, not inspiration).
- Verified end-to-end (with disposable `is_test` event/match/guest profiles, deleted afterward) that ELO is applied based on the player's **current/rotated** position, not their original one.

---

## Design System

### Theme: "Padel Soul"
- **Light**: Background `hsl(43 19% 93%)` (Cloud Dancer), Primary `hsl(222 83% 16%)` (Deep Navy)
- **Dark**: Background Deep Navy, Primary `hsl(84 100% 59%)` (Fluor Green)

### Conventions
- Border radius base: `1rem`, buttons: `rounded-2xl`
- Mobile-first, hidden scrollbars
- Shadcn components with `new-york` style and `slate` base color
- Path alias: `@/` → `src/`
- Tailwind class merging: `cn()` from `src/lib/utils.ts`

---

## Scripts

```bash
npm run dev      # Dev server (port 3000)
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
```

---

## Known Constraints & Notes

- Registration is **disabled** in the UI — new users must be created manually or via admin
- Disparity/dampening rules on ratings — see "Rating System" above for current values (don't trust older numbers you may recall; `src/lib/config.ts` is the source of truth)
- `force-dynamic` + `revalidate: 0` on dashboard, history, profile — always fresh data
- Test suite: **Vitest** (see "Testing & CI" below) — TypeScript + ESLint alone is no longer accurate
- All UI text is in **Spanish**; code, identifiers and comments in **English**
- Deployment target: **Vercel** + Supabase

---

## Workflow

- **Branches**: non-trivial features go on a branch (`feature/...`, `tune/...`), merged `--no-ff` into `main`. Small fixes go straight to `main`.
- **Before considering any change done**, run in order:
  ```bash
  npx tsc --noEmit
  npm run lint
  npm run test        # vitest run
  npm run build
  ```
- **Deploy**: manual, `vercel --prod --yes` after pushing to `main`. Vercel's auto-deploy is not relied on as the sole mechanism.
- **CI**: `.github/workflows/ci.yml` runs the same 4 steps on every push to `main` and every PR (Node 22; build step uses placeholder Supabase env vars since it never makes a real network call).

## Testing & CI

- `vitest.config.ts`: `environment: 'node'`, alias `@` → `./src`, matches `src/**/*.test.ts`.
- Current coverage is deliberately narrow — only high-risk pure logic: `rating-logic.test.ts` (ELO), `mixing-algorithm.test.ts` (pairing algorithm), `utils.test.ts` (timezone helpers). **No E2E tests, no server-action tests that talk to Supabase** — an explicit scope decision, not an oversight.
- These tests already caught one real production bug the same day they were written (see Timezone section below) — worth extending when touching similar pure logic.

## Timezone (Europe/Madrid)

`src/lib/utils.ts` (`getMadridOffsetHoursForDate`) computes Madrid's UTC offset with:
```ts
Intl.DateTimeFormat(..., { timeZoneName: 'shortOffset' }).formatToParts(date)
```
Do **not** reinterpret a Madrid-formatted date string as if it were the runtime's local time — that trick fails silently (offset=0) precisely when the runtime's own timezone already *is* `Europe/Madrid` (the most likely case for the admin's own device/dev machine). This was a real bug caught by the Vitest suite the same day it was added. The weekly-event cron (`src/app/api/cron/create-weekly-event/route.ts`) uses the same robust technique.

## Guest players

- Create: `supabase.auth.admin.createUser({ email: 'x@guest.local', password: randomUUID(), email_confirm: true })`, then update the auto-created `profiles` row (`full_name`, `rating: 3.5`, `role: 'player'`, `is_guest: true`, `matches_played/won/win_ratio: 0`).
- Delete: `supabase.auth.admin.deleteUser(id)` — cascades to `profiles`. Same pattern for both real event guests and disposable test-only profiles.
- Admin can rename a guest from `PlayerProfileDialog` (`renameGuest` in `src/app/actions/events.ts`).

## Safety when operating locally / maintenance scripts

- **Never `pkill` with broad patterns.** To kill a process on a port: `lsof -ti:PORT` then `kill <PID>` on the exact PIDs.
- **Be careful with `rm -rf .next`** if a `next dev` may be running live — it can hang. If it happens, kill only the exact PIDs (`lsof -ti:3000`) and restart `npm run dev`.
- `src/scripts/` is the established home for one-off maintenance/migration scripts (ESLint-ignored). Disposable, non-reusable test scripts live outside git at the repo root with a `.tmp-` prefix and get deleted at the end, along with any rows/users they created.
- Never touch the real production event when testing. Always use events with `is_test = true` and fully clean up everything created (matches → participants → event → guests) afterward, verifying nothing is left over.
- Before any irreversible production data migration: take a Supabase backup (`pg_dump` of the `public` schema + `auth.users` data).
