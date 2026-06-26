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
MAX_LEVEL_DIFF: 2.0      // Matches with >2.0 team gap don't affect rating
RATING_DAMPENING_THRESHOLD: 5.0  // High-rated players gain less
MIN_RATING: 0
MAX_RATING: 7
INITIAL_RATING: 3.5
MIXING_WEIGHT: 0.25      // Mixing matches worth 25%
MATCH_WEIGHT: 1.0        // Standard matches worth 100%
```

### Calculation flow (`src/lib/rating-logic.ts`)
1. Get 4 players' ratings + match counts
2. Assign K-factor (provisional vs established)
3. Parse score → intensity multiplier (0.8 tight → 1.2 blowout)
4. Apply disparity filter: if team avg diff > `MAX_LEVEL_DIFF`, no rating change
5. Clamp result to [0, 7]
6. On confirmation: update `profiles`, insert into `rating_history`

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

### Match lifecycle
```
Created (pending) → Confirmed (ratings calculated) → Audit in rating_history
                 ↘ Disputed
```

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
- Mixing matches count **25%** of standard matches toward rating
- Matches with team rating gap > 2.0 **do not affect ratings**
- `force-dynamic` + `revalidate: 0` on dashboard, history, profile — always fresh data
- No test suite configured (TypeScript + ESLint only)
- All UI text is in **Spanish**
- Deployment target: **Vercel** + Supabase
