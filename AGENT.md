# starpoint — Agent Context

## Project Overview

**starpoint** (lowercase is the brand spelling everywhere in the UI) is a mobile-only PWA for a padel group: weekly **mixing** events (a draw of partners/opponents), **partidos** (a player publishes a match to look for players), ELO-style player ratings and match history.
Tagline: _"Tu app de Pádel"_.
Language of the UI and business copy: **Spanish**. Code, identifiers and comments: **English**.
`main` is the only branch and the only source of truth (see "Workflow" and "Release status"). There is a fictional **demo** deployment of the same code (see "Demo environment").

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| Runtime | React 19 |
| Styling | **Emotion** (`@emotion/styled` + `@emotion/react`), theme in `src/theme.ts`. **No Tailwind, no shadcn** (both removed) |
| Primitives | Radix UI (`dialog`, `dropdown-menu`, `avatar`, `label`, `switch`) wrapped by our own components |
| Icons | Lucide React |
| Forms | react-hook-form 7 + Zod 4 |
| Toasts | Sonner |
| Database / Auth | Supabase (PostgreSQL + Auth, SSR cookies via `@supabase/ssr`) |
| Theme switch | next-themes (`class` on `<html>`) |
| Push | web-push + service worker |
| Tests | Vitest |

---

## Repository Structure

```
star-point/
├── src/
│   ├── app/                         # Routes (see Routing Map) + Server Actions
│   │   ├── actions/                 # 'use server' files: events, matches, mixing-generator,
│   │   │                            #   admin-matches, admin-exclusions, users, push, view-mode
│   │   └── api/cron/                # create-weekly-event, close-pending-matches
│   ├── components/
│   │   ├── atoms/                   # Avatar, Badge, Button(+ButtonLink), Card, HandTag, HeroCard,
│   │   │                            #   Input, Label, Logo, PulsatingDot, Select, Switch, Textarea
│   │   ├── molecules/               # Header, TabBar, AvatarMenu, Dialog, ConfirmDialog, Field,
│   │   │                            #   PlayerList, CourtCard, EventListItem, StatsRow, SegmentedControl, GroupProgress,
│   │   │                            #   EmptyEvents, SplashScreen, ... (stateless/light)
│   │   ├── organisms/               # Screens' main blocks with state/actions: EventOpenView,
│   │   │                            #   EventDrawView, EventGenerator, MatchEventView, AdminMatchesList,
│   │   │                            #   HistoryList, ExclusionsManager, PlayersAdminList
│   │   ├── events/ profile/ dashboard/ layout/   # Feature components (forms, dialogs, listeners)
│   │   └── providers/               # EmotionProvider (cache + theme), GlobalStyles
│   │   (+ app/opengraph-image.tsx: share image of the links, 1200x630, drawn from code; app/pwa-icon/[size]: app icon)
│   ├── lib/                         # Pure logic and server helpers (see below)
│   ├── types/                       # index.ts, events.ts, draw.ts
│   ├── theme.ts                     # light/dark design tokens (+ emotion.d.ts typing)
│   └── utils/supabase/              # client.ts, server.ts, admin.ts (service role)
├── docs/social-preview.png          # brand image used by the README (and GitHub social preview if the repo goes public)
├── supabase/                        # SQL applied by hand (see Database)
│   ├── supabase_schema_full.sql     # Complete schema (structure only), validated by building the demo from scratch
│   └── supabase_*.sql               # Migrations and the hourly cron job
├── vercel.json                      # Weekly-event cron
└── AGENT.md
```

Key `lib/` files: `rating-logic.ts` + `config.ts` (ELO), `mixing-algorithm.ts` (draw), `confirm-match.ts`
(rating + confirmation core), `event-draw.ts` / `admin-pending.ts` (server-built DTOs), `match-events.ts`
(partidos rules), `view-mode.ts` (admin/player view), `admin.ts` (`requireAdmin`), `emotion-registry.tsx`
(SSR style cache), `utils.ts` (dates in Madrid time, helpers).

---

## Routing Map

| Route | Purpose | Access |
|---|---|---|
| `/` | Home: greeting, pending actions, "Lo que viene", stats, last match | Public (visitors see open events without names; the rest needs a session) |
| `/login`, `/reset-password` | Auth (registration is closed) | Public |
| `/mixing` | Mixings in progress / upcoming + the viewer's status | Session |
| `/partido` | "+ Partido" form (publish a match) | Session |
| `/events/[id]` | Event page: mixing sign-up, mixing draw, or partido (depends on `kind`/`status`) | Session |
| `/history`, `/profile` | Match history, profile & settings | Session |
| `/admin/events/new`, `/admin/matches`, `/admin/players`, `/admin/exclusions`, `/admin/events/[id]/generate` | Admin tools, reached from where they are used: the admin-view toolbar on `/mixing` (create event, pending matches with a counter, players), the event page (generate draw) and the generator (draw exclusions). There is no `/admin` hub | **Real** admin role (checked in `app/admin/layout.tsx`) |
| `/dashboard` | Redirects to `/` (kept for old links/bookmarks) | — |
| `/api/cron/*` | Cron endpoints, `Authorization: Bearer $CRON_SECRET` | Secret |
| `/opengraph-image`, `/pwa-icon/[size]` | Images generated with `next/og`. `metadataBase` is `https://star-point.vercel.app` so `og:image` is always the production URL | Public |

Tab bar: Inicio · Mixing · **+ Partido** (was "Ranking", replaced) · Perfil. Guests see Inicio and Entrar.

---

## Roles and the admin/player view

- Real role: `profiles.role` (`player` | `admin`). Permissions are **always** checked against the real role on the server.
- **Admin view** is a display preference stored in the `sp_view` cookie (`lib/view-mode.ts`, `setAdminView` action). Admins start in the *player view*; the avatar menu switches it. **The avatar menu exists only for admins and only holds that switch** (everyone else has the Perfil tab, which also has "Cerrar sesión"; for them the avatar is a plain image). It decides what is *shown* (levels, admin tools, all matches in the draw); it never grants permissions.
- Admin pages call `requireAdmin()`; `app/admin/layout.tsx` guards the whole `/admin` subtree.

---

## Database (Supabase)

Migrations/jobs live in `supabase/` as `supabase_*.sql` and are applied by hand (Supabase MCP `apply_migration` or the SQL editor). **Always get explicit confirmation before applying anything to production.**
All applied in production: `clubs_courts`, `matches_auto_close`, `events_kind`, `court_names`, `match_known_players` (adds `events.known_players` and `events.notes`), `security_hardening` and the hourly `pg_cron` job of `supabase/supabase_cron_close_pending_matches.sql` (it carries `CRON_SECRET`: the user pastes it in the Supabase SQL editor, never in the chat, and the file in git keeps the `<CRON_SECRET>` placeholder). `supabase_schema_full.sql` is the whole structure in one file (it does not replace the incremental migrations, which are the history).
The MCP `execute_sql` tool may be refused for production DDL/DML the user has not clearly approved; when it is, give the user the SQL file to run in the SQL editor instead of retrying.

### Tables (public)
- `profiles`: `id` (= auth user), `full_name`, `email`, `avatar_url`, `rating`, `role`, `matches_played`, `matches_won`, `win_ratio`, `gender`, `preferred_hand`, `court_position` (`reves|drive|ambos`), `is_guest`.
- `events`: `title`, `start_time` (timestamptz), `max_spots`, `rounds`, `duration_minutes`, `status` (`open|in_progress`), `created_by`, `is_test`, `club_id` (nullable), **`kind`** (`mixing` default | `match`), `known_players` (`text[]`: names of the players a partido's organizer already has settled), `notes` (`text`: the organizer's free comment on a partido).
- `event_participants`: `event_id`, `user_id`, `joined_at` (order = sign-up order; positions beyond `max_spots` are reserves).
- `matches`: `creator_id`, `match_type` (`match|mixing`), `status` (`pending|confirmed|disputed|expired`), `event_id`, `player_a1/a2/b1/b2`, `score_details`, `rating_change`, `court_number`, `court_id` (→ courts), `court_name` (legacy text), `round_number`, `last_updated_by`, **`result_updated_at`** (set by trigger when the score changes).
- `clubs` / `courts` (`club_id`, `name`, `position`): 8 clubs in Jaén seeded; Padel Indoor, Padel Akademia and Padel Premium have their real court names, the rest are generic "Pista N". **`position` is the default order**: the generator preselects the first N courts, so Padel Indoor starts with Blanca Impresores, Joyería Pósito, Hacienda La Laguna, Estrella Damm. Public read, admin write.
- `rating_history`, `notifications`, `push_subscriptions`, `mixing_exclusions` (`no_partner|no_opponent|no_contact`), `mixing_incentives` (unused by the UI).
- RPCs (SECURITY DEFINER): `confirm_match_atomic` (the only writer of ratings/stats), `leave_event_atomic` (also promotes the first reserve).

### Security notes (important)
- RLS: events/clubs/courts/event_participants are publicly readable (the public home needs counts). **Known issues pending the hardening migration**: anon can execute the two RPCs and, because `auth.uid()` is NULL for anon, their authorization checks are bypassed; `profiles` (with emails), `matches` and `rating_history` have public SELECT policies. The migration also allows the service role explicitly (cron/auto-close run with `auth.uid()` NULL).
- `matches` UPDATE policy lets any participant update any column of their match (including `status`). Not fixed.
- **`matches` has no DELETE policy for users.** A delete with the normal client returns no error and removes nothing (this left stale matches behind and made the generator say "ya tiene partidos generados"). Every action that deletes matches (`deleteEvent`, `reopenDraw`, `updateEvent` when it undoes a draw, `saveAllRounds` when it clears leftovers) deletes with the **admin client after authorizing the caller**.
- Never trust ids coming from the client in Server Actions: derive the user from the session (see `getMatchHistory`, which ignores any id).
- Files with `'use server'` may **only export async functions** (types are fine). Put constants/helpers in a plain module (e.g. `lib/match-events.ts`).
- Use the service-role client (`utils/supabase/admin.ts`) only after authorizing the caller (players cannot insert events directly: `createMatchEvent` validates and then writes as admin).

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server only
CRON_SECRET                      # protects /api/cron/*
NEXT_PUBLIC_VAPID_PUBLIC_KEY     # push
VAPID_PRIVATE_KEY
VAPID_SUBJECT
TEST_PUSH_USER_IDS               # optional: comma-separated user ids that receive the pushes of is_test events (none set = nobody)
WEEKLY_EVENT_CREATED_BY          # optional: owner of the weekly event (none set = the first admin)
PUSH_DISABLED=true               # optional, local only: no push is sent (testing against the real DB without bothering the group). Never set it on Vercel
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
`src/lib/config.ts` is the source of truth; don't trust numbers you may recall.

### Calculation flow (`src/lib/rating-logic.ts`, applied by `lib/confirm-match.ts`)
1. Get 4 players' ratings + match counts
2. Assign K-factor (provisional vs established)
3. Parse score → intensity multiplier weighted by `MATCH_WEIGHT`
4. Apply disparity filter: linear falloff between `DISPARITY_FULL` and `DISPARITY_ZERO` team gap
5. Apply dampening for high-rated players between `DAMPENING_START` and `DAMPENING_END`
6. Clamp result to `[MIN_RATING, MAX_RATING]`
7. On confirmation: the Postgres RPC `confirm_match_atomic` is the **only** place that writes `profiles.rating`, `matches_played`, `matches_won`, `win_ratio` and inserts into `rating_history` — atomic transaction with a `FOR UPDATE` lock + `ALREADY_CONFIRMED` guard. If the match's event has `is_test = true`, nothing is written to ratings (use `is_test` events for end-to-end tests).

`applyMatchConfirmation` (`lib/confirm-match.ts`) holds steps 1–7 and is shared by the user action `confirmMatch` (which checks permissions) and the auto-close cron (service role). It is a plain module, not a Server Action, so clients cannot call it.

### Scores
Only **total games** are stored/shown (`"8-5"`), never sets. Older rows with several sets (`"6-4 6-2"`) are summed (`totalGames` in `lib/utils.ts`).

### Rating tuning history
- `MATCH_WEIGHT` was raised 0.40 → 0.70 on 2026-07-16 after ~3 weeks of real usage showed ratings barely differentiating players. Candidates were compared by simulating both rating spread *and* actual pairing quality (running the real `generateMixingRound` hundreds of times), not just spread.
- Applied **retroactively** (recomputing `rating_history` chronologically) via `src/scripts/retroactive-match-weight.ts`: dry-run by default, writes only with `--apply`. Reference pattern for any future retroactive rating change: simulate with real data → show the result to the user → apply only after explicit confirmation.

---

## Mixing Algorithm (`src/lib/mixing-algorithm.ts`)

Two layers: (1) plan groups of 4 per round (random start + local search over swaps, several restarts); (2) pick the pairing inside each group (3 possible splits).

**Cost hierarchy** (most to least important):
1. HARD: exclusions (by type) and a **partner repeated within this event**. Only counted when *no* pairing of the group can avoid it (two ex-partners may share a court as rivals).
2. STRONG: meeting again on a court **within this event** (`session_encounter_counts`).
3. SOFT: level (balanced pairs + similar court averages) — outweighs repeating things from the **previous event**.
4. SOFT, lower: meeting / partnering as in the previous event (`encounter_counts`, `partner_history`).
5. Tie-break: court position (drive + revés).

- Data model: `partner_history` = partners in the *previous* event (soft); `session_partner_history` = partners in *this* event (hard); built in `getEventMixingData` (`app/actions/mixing-generator.ts`, admin only).
- Level and position are always on (`CONFIG` in `EventGenerator`); there are no switches. `genderMode` is unused.
- Warnings are only about repeats **within this event** (and forced exclusions/partner repeats); never about the previous event. A pair that were partners and are now rivals (or the reverse) is **not** a warning: only meeting again in the **same relation** is (rival meetings = total meetings minus the one as partners).
- Math to keep in mind: with groups of 4, 12 players / 3 rounds cannot avoid repeats (minimum 9 re-meetings); 16 players can reach 0 for up to 5 rounds. Typical event: 12 players, 3 rounds, 90 min.
- Simulation workflow used to tune it: build a throwaway `*.test.ts` that runs the real algorithm many times with a prior event's history, writes metrics to a file, then delete it. Tests in `mixing-algorithm.test.ts` fix the guarantees (no partner repeats; 12/3 ≤ 10 re-meetings; 16/3 ~0).
- Admin flow (`EventGenerator`): "Pistas de hoy" (courts of the event's club, first N preselected) → generate / regenerate → summary (`summarizeRounds`) → publish (`saveAllRounds`: admin only, status must be `open`, refuses a draw on top of one with results (leftover matches without a result, e.g. from an undone draw, are replaced), validates the courts belong to the club, saves `court_id`+`court_name`, pushes "¡Sorteo listo!").
- The generator's manual player swap was removed (recoverable from git, commit `00c9018`); if ever revived it must be restricted to the same court.

---

## Events: mixing and partido

- **Mixing** (`kind = 'mixing'`): created by the weekly cron or by an admin (`/admin/events/new`, with club). Lifecycle: `open` (sign-up, reserves up to `max_spots + 6`) → admin generates and publishes the draw → `in_progress` → hidden once all its matches are confirmed (`isEventFullyConfirmed`; there is no `finished` status).
  - **Admin tools once the draw is published** (panel "Administrar evento" in `EventDrawView`): *Editar evento* (`updateEvent`: title/date/time/duration keep the draw; changing courts, rounds or club **undoes the draw**), *Rehacer* (`reopenDraw`: deletes the matches and goes back to `open`), *Anular* (`deleteEvent`, also valid for `in_progress`), and *Cambiar parejas* on each pending match (`rotateMatchPairs` cycles the 3 possible pairings; blocked once a result exists). Everything that undoes a draw is blocked as soon as any result is entered.
  - **Draw view**: the round tab follows the clock (`roundStartsAt`; re-checked every 15 s and on `visibilitychange`) and moves to the next round after confirming a result. Event cards say "Partidos creados" until the start time and "En juego" after it (`drawAvailability`). "Así va el grupo" and the cards show the waiting list ("N en reserva").
- **Partido** (`kind = 'match'`, `lib/match-events.ts`): any player publishes club + date + time + how many players are missing (1–3). Always 90 min, 4 players, title "Partido". `max_spots = organizer + needed`, **no reserves**, no draw, no results. Shown in "Lo que viene" (also to visitors, no names), hidden after start + 90 min, not listed in `/mixing`. The organizer can edit/cancel (not leave without cancelling); an admin can cancel too. Publishing pushes the whole group. Actions: `createMatchEvent`, `updateMatchEvent`, `cancelMatchEvent`.
  - **Always 4 rows** in the list: the organizer, the players the organizer already has settled outside the app (`4 - max_spots` rows, shown as "Jugador confirmado" or with the name saved in `events.known_players` via `setMatchKnownPlayer`), the players who sign up, and free spots. The settled rows are display-only: they do not count in `max_spots` and cannot be opened or removed.
  - **Players from outside the group**: the organizer (or an admin) adds them with "Añadir jugador" (`addGuestToMatch`: a guest profile named by the organizer that takes a real spot), renames them (`renameMatchGuest`) or removes them (`removeGuestFromMatch`, which also deletes the guest). No "Inv." tag and no hand pills in partidos.
  - **Comment** (optional, 140 chars, `MATCH_NOTES_MAX`, suggestion chips in `MATCH_NOTE_SUGGESTIONS`): stored in `events.notes` and shown on the partido page. The partido page says "palas" for missing players ("Faltan 2 palas…"); the home card and the join bar still say "jugadores".
- Weekly cron (`vercel.json`, Wednesdays 20:00 and 21:00 UTC; the route only acts when it is 22:xx in Madrid, covering DST) creates next Wednesday's event titled "Mixing Padel y Risas" at **Padel Indoor** (club looked up by name) at 20:00; it refuses to create a duplicate.
- Round times are **derived**: the event duration is split evenly between its rounds (`roundStartsAt` / `roundEndsAt` in `lib/utils.ts`).

---

## Match lifecycle

```
pending (0-0)  →  someone enters the score  →  pending (score)  →  confirmed (ratings applied)
                                                 ↘ rival corrects the score → back to pending for the other side
                                                 ↘ no answer for 24 h → auto-confirmed (silence = agreement)
pending without score, 24 h after the event ended → expired (no ratings)
disputed = legacy/admin state; players have no UI to dispute anymore
```
- Player UI: Home "pending action" cards. "Introducir resultado" cards appear when the round **ends**; "Confirmar" cards appear as soon as another player enters a score. Confirming opens a **review sheet** (`ResultReviewDialog`): confirm, or "Hay un error en el marcador" → correct the score (the rival must confirm), no admin involved.
- Auto-close: `/api/cron/close-pending-matches` (hourly via **pg_cron + pg_net**, not scheduled yet) confirms scored pending matches 24 h after `result_updated_at` and expires 0-0 ones 24 h after the event ended. Disputed matches are left alone.
- Admin: `/admin/matches` lists every pending match (confirm, edit result, rotate partners, change court, delete). `rotateMatchPlayers` rotates `a2 → b1 → b2` keeping `a1` fixed and is blocked once a result exists.

---

## Privacy rules (enforced on the server)

- **Players never see other players' levels (ratings).** They see each player's *hand* (`court_position`). Admins (in admin view) see levels. Strip data on the server (`lib/event-draw.ts`, `app/events/[id]/page.tsx`); hiding in the UI is not enough — check the network tab.
- In the draw, a player only receives **their own match**; admins receive all.
- Visitors only get non-sensitive event data (`getPublicEvents`: no names, only counts).

---

## Design System

- Mobile only: one fixed column of **30rem** (`theme.layout.maxWidth`), **no breakpoints**. `AppShell` wraps every page.
- Tokens in `src/theme.ts` (`lightTheme`/`darkTheme`, brand: forest green + lime). Use `theme.colors.*`, `theme.radii.*`, `theme.shadows.*`, `theme.fonts.*`, `theme.layout.*`; avoid hardcoded colors. Check contrast when adding tokens (inputs use `field`/`fieldBorder`, ≥3:1).
- Spacing and type are closed scales: `theme.spacing(3, 4)` → `'0.75rem 1rem'` (steps 0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12 on a 4px grid; 0.5 = 2px only for hairline offsets such as pill padding) and `theme.fontSizes.*` (`2xs` 10px … `display` 64px). Never write a raw rem/px for padding, margin, gap or font-size; if a value is missing, discuss adding a step instead of going off-scale. Deliberate exceptions, kept as literals: the logo lockup (`Logo.tsx`), the splash art, negative optical offsets, and room reserved for an icon inside a field (`PasswordInput`, `Select`). Inside plain helper functions that receive the theme (e.g. `itemStyles`, `sizes`), use `${theme.spacing(...)}`, not the `({ theme }) =>` form.
- `EmotionProvider` = SSR style cache (`lib/emotion-registry.tsx`) + theme from next-themes. `GlobalStyles` sets the reset and colors through CSS variables switched by the `.dark` class, so there is no light→dark flash. Emotion `theme` itself starts light until mounted.
- Fonts: DM Sans (body) and Space Grotesk (titles) via `next/font`.
- Conventions: styled components with transient props (`$variant`, `$size`) + `shouldForwardProp` for custom props; `Button` variants: primary, accent, outline, ghost, danger, warn, link (`ButtonLink` for links); `Dialog` is a bottom sheet; page shells follow `Header` → `PageIntro`/intro → `Content` → `TabBar`. `Content` reserves room for the fixed TabBar (pages that render something after it opt out with `$clearTabBar={false}`).
- Colors added for dark mode: `card` (raised cards such as "Así va el grupo") and `subtle` (secondary text on cards). A hardcoded color is a dark-mode bug waiting to happen.
- The footer is shown **only on the home**.
- **Splash** (`SplashScreen`, mounted in the root layout): lime screen that contracts into the logo's dot, the tile spins to -7deg, letters rise, credits. Shown once per session (`sessionStorage`), only on `/`, never with `prefers-reduced-motion`; an inline script marks `<html data-splash="skip">` before first paint so it never flashes. It always uses `lightTheme` and sets the `theme-color` meta to light while visible. It has a `hold` prop to keep it on screen for design review.
- Home with nothing scheduled: `EmptyEvents` ("Aún no hay nada programado" + a "Crear partido" button for signed-in players).
- Event cards: a pill "Apuntado" on the status line (never next to the title: long titles wrap) and no highlight border.
- Touch devices (`hover: none` and `pointer: coarse`) hide every scrollbar. Date/time `Input`s are reset for iOS Safari and two-column grids use `minmax(0, 1fr)` (otherwise the two fields overlap).
- UI text in Spanish; the user dislikes filler copy — keep texts short and useful, and don't repeat information (e.g. a pill that repeats the title).
- Atoms → molecules → organisms: put stateless/presentational pieces in `molecules`, screen blocks that own state/actions in `organisms`; server pages build DTOs and pass plain props.

---

## Scripts

```bash
npm run dev       # Dev server (port 3000)
npm run build     # Production build
npm run lint
npm run test      # vitest run
```

---

## Known Constraints & Notes

- Registration is closed in the UI. **Also disable "Allow new users to sign up" in the Supabase dashboard** (hiding the form does not stop API sign-ups).
- Pages are `force-dynamic`; `/dashboard` is only a redirect.
- Guests (`is_guest`) are profiles created by an admin to fill events; they can't log in.
- The Supabase advisors flag the issues in "Security notes"; run `get_advisors` after DB changes.

---

## Workflow

- **Branches**: only `main`. Work on it directly; for something that needs a Preview first, create a short-lived branch and **delete it as soon as it is merged** (local and remote). Last time forgetting this left 40 stale branches. Before deleting anything, check `git rev-list --count origin/main..<branch>` and take a backup (`git bundle create <file> --all`). Conventional commit messages in Spanish (`feat(...)`, `fix(...)`, `chore:`), ending with the Co-Authored-By line given by the harness.
- **Only commit/push when the user asks** ("ok/sí" to "¿hago commit y push?"). Stage files explicitly when something must stay out of a commit.
- **Before considering a change done**, run: `npx tsc --noEmit`, `npm run lint`, `npm run test`, and `npm run build` for larger changes. State plainly what was and wasn't verified (most screens need a logged-in session, which the agent does not have).
- **Deploy**: a push to `main` deploys **both** Vercel projects (`star-point`, production, and `star-point-demo`, the fictional demo), so they stay identical. Past automatic deploys failed silently: always check that the Production deployment reaches "Ready" and, if not, run `vercel --prod --yes` (it publishes **everything** in the working tree; ask first). `CRON_SECRET` and the VAPID keys exist only in the production project. If a push of a feature branch produces no Preview, run `vercel deploy --yes` (a Preview, not production).
- The agent's shell does not have the user's PATH: run the CLI through `zsh -ic 'vercel …'`. If the token expires (`The specified token is not valid`) the user runs `! vercel login` (interactive, in the browser).
- **Releases**: bump `package.json`, tag `vX.Y.Z` and push the tag. `v1.0.0` (2026-10-07) is the redesign. The user rotates `CRON_SECRET` later (it was exposed once in a conversation): new value in Vercel (Secret), redeploy, then `cron.alter_job` in Supabase.
- CI (`.github/workflows/ci.yml`) runs the same steps on push to `main` and PRs.

## Testing

- Vitest, `environment: 'node'`, alias `@` → `src`, files `src/**/*.test.ts`. Covered: ELO (`rating-logic`), the mixing algorithm, and date helpers (`utils`: Madrid timezone, round start/end).
- No E2E and no tests that talk to Supabase (explicit scope decision). Random algorithms: assert invariants over several runs, never exact outputs, and run the suite a few times to catch flakiness.

## Timezone (Europe/Madrid)

All displayed dates/times are formatted with `timeZone: 'Europe/Madrid'` on the server (Vercel runs in UTC) — never rely on the browser's zone (see `ShareEventButton`). `start_time` is a `timestamptz`, so arithmetic on it (round ends, 90-minute expiry) is timezone-independent.
`getMadridOffsetHoursForDate` in `src/lib/utils.ts` computes the offset with `Intl.DateTimeFormat(..., { timeZoneName: 'shortOffset' }).formatToParts(date)`. Do **not** reinterpret a Madrid-formatted string as local time — it silently gives offset 0 when the runtime is already in Madrid (a real bug caught by the tests). The weekly cron uses the same technique.

## Guest players

- Create: `supabase.auth.admin.createUser({ email: 'x@guest.local', password: randomUUID(), email_confirm: true })`, then update the auto-created `profiles` row (`full_name`, `rating: 3.5`, `role: 'player'`, `is_guest: true`, stats zeroed).
- Delete: `supabase.auth.admin.deleteUser(id)` (cascades to `profiles`).
- Admin can rename a guest from `PlayerProfileDialog` (`renameGuest`). In partidos the organizer manages their own guests (see "Events").

## Safety when operating locally / maintenance scripts

- **Never `pkill` with broad patterns.** To free a port: `lsof -ti:PORT` then `kill <PID>` on the exact PIDs.
- Be careful with `rm -rf .next` while `next dev` may be running; a `next build` next to a running dev server is fine.
- `src/scripts/` holds one-off maintenance scripts (ESLint-ignored). Disposable test scripts live outside git with a `.tmp-` prefix and are deleted afterwards, along with any rows they created.
- Never touch the real production event when testing: use `is_test = true` events and clean up everything created (matches → participants → event → guests).
- Before any irreversible production data migration take a Supabase backup (`pg_dump` of `public` + `auth.users`).
- zsh gotcha: unquoted variables are **not** word-split (`git push origin --delete $LIST` silently did nothing, and `env $VAR_STRING cmd` does not work either): use a `for` loop, or `bash -c "export A=1 B=2; cmd"` when sweeping parameters.

## Release status (2026-10-07)

`v1.0.0` is in production: the redesign (Emotion, public home, partidos with comment/guests/settled players, waiting list, editable and redoable published draws, auto-close of pending matches, clubs/courts, splash, share image). Done on release day: security hardening applied and verified, hourly `pg_cron` close job scheduled, public sign-ups disabled, weekly cron registered (it fires Wednesdays at 22:xx Madrid and creates next Wednesday's event), 40 branches deleted (backup bundle kept by the user). A historic match was corrected (score 2-0 to 4-6) by replaying its rating chain with a backup first.
Parked: a blank list reported after confirming a result in the draw view could not be reproduced without a session (the user asked to leave it until they say otherwise). Cleanup to do now that it has settled: stale "Legacy dialog (Tailwind)" comments, unused `public/*.svg`, one-off scripts in `src/scripts` (keep `retroactive-match-weight.ts`, `create-admin.js` and `seed-demo.ts`), maybe rename `components/dashboard`. Rotate `CRON_SECRET`, revoke the Supabase access token used for the demo.

---

## Demo environment

A fictional copy for showing the app (portfolio, recruiters) without exposing the real group: **https://star-point-demo.vercel.app**.
- **Data**: Supabase project `dibjelontnvnqdqaljqo` (the real one is `idnovsdkodfxaumkbosy`; never mix them up). Built from `supabase/supabase_schema_full.sql` plus `src/scripts/seed-demo.ts`: 16 Springfield characters, 8 past mixings with a real draw and real ELO (the shown ratings are an Elo replay, so they match what the app would compute), a published draw, an open mixing, two partidos, one exclusion and 3 fictional clubs. Accounts: `demo@example.com` (player) and `admin-demo@example.com` (admin), password = `DEMO_PASSWORD`. Public sign-up is disabled.
- **Seed script**: `npx -y tsx src/scripts/seed-demo.ts` (dry run, writes nothing), `--apply`, `--apply --reset` to rebuild. It reads **only** `.env.demo.local` (git-ignored: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `PUSH_DISABLED=true`, `DEMO_PASSWORD`) and refuses to run unless the URL is the demo project's.
- **Deployment**: Vercel project `star-point-demo`, connected to the same repository, so a push to `main` deploys both. Its env vars are the demo's own, plus `NEXT_PUBLIC_DEMO=true`, which shows `DemoBanner` and makes `create-weekly-event` skip. No VAPID keys, no `pg_cron`.
- **Never run `vercel link` in this directory** (it would point production deploys to the demo). Target the demo only per command with `VERCEL_ORG_ID=<team> VERCEL_PROJECT_ID=<demo project id>`; project settings and env vars go through `vercel api` (the CLI's own session). Secrets are piped from the env file to Vercel, never printed.
- **MCP**: two Supabase servers with different names: `supabase` (production) and `supabase-demo` (user scope, `--project-ref` of the demo). **Name the project before every change** and double-check it with `get_project_url`. Production data and DDL need the user's explicit approval; the demo is for experiments.
