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
│   │   └── api/cron/                # create-weekly-event, close-pending-matches, generate-draws
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
- **`profiles` UPDATE is granted per column** (`supabase_migration_profiles_column_grants.sql`, applied in prod and demo): players can only change `full_name`, `avatar_url`, `gender`, `preferred_hand`, `court_position` and `updated_at` of their own row. Before it, `profiles_update_own` let any player set their own `role`/`rating` through the API. A new column is server-only by default; if the profile page must edit it, add a `grant update (col)`. Gotcha: `revoke update on table` does **not** remove column-level grants (production had them): revoke column by column. The signup trigger inserts the initial rating (3.5).
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
ANTHROPIC_API_KEY                # demo project only: the AI partido filler (see "AI: partido from free text")
AI_MATCH_PARSER                  # optional: false turns the AI filler off; mock (local only) gives canned answers without the API
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

## AI: partido from free text (demo only)

A box above the "Publicar partido" form ("Escríbelo y lo relleno por ti") turns a sentence, typed or dictated, into the form values with Claude Haiku 4.5. **It never publishes**: it fills the same react-hook-form form and the player reviews and publishes. Read it outside-in: `app/partido/page.tsx` → `components/events/MatchForm.tsx` (`applyFill`, amber/lime `Flash`) → `MatchAssistant.tsx` → `lib/use-speech-dictation.ts` → `app/actions/match-parser.ts` → `lib/match-parser.ts`.

- **Where it runs**: only on the public demo (`NEXT_PUBLIC_DEMO=true` + `ANTHROPIC_API_KEY`), for every signed-in account; `isMatchParserOn()` decides on the server and the production app never shows it. The demo keeps `AI_MATCH_PARSER=false` until the user buys API credits (they only will when a recruiter asks for access): with a key but no credits every call fails with "No he podido entender el texto".
- **Server action gates, cheapest first**: session → switch → 300 chars → usage caps → model. Caps: 5 per account and **50 for the whole demo** per rolling 24 h (demo accounts are shared by every visitor), counted in `ai_requests` (demo DB only; RLS on, no policies). The row is inserted **before** counting so parallel requests cannot all slip under the cap; a failed count counts as over the limit.
- **Model call**: `client.messages.parse` + `zodOutputFormat(parsedMatchSchema)` in `output_config.format`. Structured outputs do not support numeric/length constraints (the SDK strips them), so limits live in `normalizeParsedMatch`.
- **Treat the model output as untrusted input**: `normalizeParsedMatch` drops clubs that are not in the DB, impossible or past dates, invalid times and more than 3 players, and turns each drop into a doubt shown to the player. Required fields the text did not mention come back as `missing` (computed by code, not by the model) and the form keeps and flags their value ("No has dicho la hora: he dejado las 20:00").
- **Prompt**: the real club list plus a precomputed 21-day calendar ("jueves 2026-10-15"), so the model looks dates up instead of doing calendar maths; "better null and a doubt than a guess"; the player's text is data, never instructions (prompt injection is one of the eval phrases).
- **Dictation**: the browser's Web Speech API (`es-ES`), free, text only reaches the server. On iOS only Safari gets the service: Chrome/Firefox/Edge on iOS expose the recognizer but fail with `service-not-allowed`, so the button is hidden there (UA check) and also after that error; the hint points to the keyboard microphone. The microphone needs HTTPS: test on a phone through the **demo** Preview, not the LAN IP. In Playwright, fake both `window.SpeechRecognition` and `webkitSpeechRecognition` (current Chrome has the unprefixed one).
- **Local work**: `.env.local` points to the **production** DB. For this feature run against the demo: `set -a; source .env.demo.local; set +a; AI_MATCH_PARSER=mock npm run dev` (mock: canned answers; "error" in the text shows the failure state). Never test on the Preview of the production project: it uses the production DB with push on.
- **Verification**: unit tests for the pure part (`lib/match-parser.test.ts`) and an eval against the real model, `npx -y tsx src/scripts/eval-match-parser.ts` (16 phrases with expected fields, frozen date, ~$0.05 per run; reads the key from `.env.local`). Change the prompt → run the eval.
- Cost reference: ~$0.003 per request (Haiku 4.5, $1/$5 per million tokens).

---

## Loading performance (first byte and splash)

- **The home streams.** `src/app/(home)/loading.tsx` (route group: the URL stays `/`, and the rest of the pages keep their normal redirects) makes Next send the layout, with the splash, as soon as the function starts instead of after the last query. Without it the first byte waited for the whole page (0.6 to 1.2 s, spikes of 10 s whenever Supabase was slow) and the screen stayed blank. The fallback is `Header loading` + `HomeSkeleton` + `TabBar` (logged in or not guessed from the `sb-*-auth-token` cookie, no network), so coming back to Inicio does not make the header and tabs blink. Measured on a production build: first byte 12-120 ms, full response 0.17-9.5 s.
- **Independent queries go in `Promise.all`** (`(home)/page.tsx`: profile, pending actions, last match, events). `getOpenEvents` still calls `getUser` itself; in parallel that costs no extra time.
- **Functions run in `dub1` (Dublin)**, next to Supabase `eu-west-1` (`regions` in `vercel.json`, shared by both projects: the demo database's region was assumed to be the same, check it if the demo feels slow). Vercel's default, `iad1` (Virginia), put an ocean between every function and its database. Check with the `x-vercel-id` header (`cdg1::dub1::…`).
- Measuring: `curl -w '%{time_starttransfer}'` against the production URL; to test the splash with a slow hydration, delay `**/_next/static/**/*.js` with `page.route` in Playwright.

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
- Automatic draw: `/api/cron/generate-draws` (every 15 minutes via **pg_cron + pg_net**, job in `supabase/supabase_cron_generate_draws.sql`; Vercel Hobby cron only runs once a day with ±59 min of precision, so it cannot do this) makes and publishes the draw of each open mixing that starts in 3 h or less (17:00 for a 20:00 event). Logic in `src/lib/auto-draw.ts`; the publication (`src/lib/draw-publish.ts`) is shared with the admin generator (`saveAllRounds`) and claims the event atomically (status `open` → `in_progress` in one update), so overlapping runs cannot duplicate a draw. It keeps the best of 10 random draws (fewest warnings, then fewest repeated meetings), takes the first N courts of the club by position, and tells the admins by push. If the event is not full (or the club lacks courts) it generates nothing, tells the admins once (first 15-minute window) and retries quietly every run until the event starts, so a late sign-up completes it. `AUTO_DRAW=false` switches it off without redeploying; the demo deployment never runs it. Publishing a draw (manual or automatic) sets `events.draw_published_at`, and the cron only acts on open events where it is null: after a **Rehacer** the admin takes over and it never redraws behind their back. An admin can still **Rehacer** or **Anular** afterwards, and can publish a draw manually at any time before (then the event is no longer `open`).
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
- **Accessible color (WCAG 2.2 AA, 4.5:1 for text).** `e2e/a11y.spec.ts` runs axe-core over the main screens in both themes and must report nothing. Rules that came out of fixing ~250 contrast failures:
  - Text in the brand green uses **`colors.forestText`**, never `forest`: in the dark theme `forest` (`#2f7a62`) is a *surface* (buttons, cards) and is too dark to read as text on the dark background (3.3:1). In the light theme both are the same. Exceptions: the logo and the splash court (large or decorative), text on lime (`forestDeep`) and the avatar initials (fixed beige and `#123d32`).
  - Red as text uses `dangerText`; `danger` stays the button/stripe color, because white text on it needs 4.5:1 too. Text on coral pills uses `onCoral`.
  - `muted` is `#626b66` (was `#7c8780`, 3.6:1), `subtle`, `tabInactive` and the light `amber` were darkened for the same reason. Check any new text color against the worst background it can sit on (the coral and green tinted rows are the darkest), not just the page.
  - `HeroCard` uses the `hero` token (a darker green than `forest` in the dark theme) and its soft text uses opacity 0.75-0.8: not even pure white reaches 4.5:1 on the dark `forest` with the lime tint over it.
  - Automated checks cover only part of WCAG: this is a regression guard, not an audit.
- **Splash** (`SplashScreen`, mounted in the root layout): lime screen that contracts into the logo's dot, the tile spins to -7deg, letters rise, credits. Behind the logo a padel court (10 x 20 m, forest green at 20% opacity; lime at 40% under `html.dark`, because the splash background does follow the dark mode while its colors come from the light theme) draws itself from 900 ms: the outline is an SVG path traced clockwise from the top-left corner (`stroke-dashoffset`, removed at the end because a dashed closed path leaves a notch where it starts), and the net, the two service lines (6.95 m from the net) and the two center lines are boxes that grow with `scaleX`/`scaleY`. The court is centered on the logo tile (the dot is the court's center mark) and the inner lines stop short of the logo and wordmark (`--logo-gap-*` in `Court`). The whole thing lasts `SHOW_MS` (3.4 s) so the finished court is seen before the fade. **The exit is a CSS animation (`leave`, delay `SHOW_MS`) that starts with the first paint**, not a timer started after hydration: a slow hydration used to add its own time to the splash. React only removes the element when that animation has finished (`getAnimations()`), and the inline guard script marks `sessionStorage` at first paint. To review frames exactly, pause the animations with `document.getAnimations()` and set `currentTime` (and ignore the 3.1/3.6 s timers). Shown once per session (`sessionStorage`), only on `/`, never with `prefers-reduced-motion`; an inline script marks `<html data-splash="skip">` before first paint so it never flashes. It always uses `lightTheme` and sets the `theme-color` meta to light while visible. It has a `hold` prop to keep it on screen for design review.
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
npm run test:e2e  # Playwright against the demo (see Testing)
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

- Vitest, `environment: 'node'`, alias `@` → `src`, files `src/**/*.test.ts`. Covered: ELO (`rating-logic`), the mixing algorithm, the auto draw, join copy (`event-capacity`), the AI partido filler's checks (`match-parser`), and date helpers (`utils`: Madrid timezone, round start/end).
- Anything that depends on a model is measured with an eval script, not unit tests (`src/scripts/eval-match-parser.ts`).
- **E2E with Playwright** (`e2e/`, `npm run test:e2e`): 26 tests (16 of them accessibility, see Design System) on the real flows (public home and redirects to login, login, the splash leaving by itself and showing once per session, publishing a partido, another player joining and leaving, the organizer cancelling).
  - **Only against the demo.** `e2e/global-setup.ts` refuses to run unless `NEXT_PUBLIC_SUPABASE_URL` is the demo project (the tests write rows). Credentials come from `.env.demo.local` (loaded by `playwright.config.ts`; `DEMO_PASSWORD`, anon and service-role keys).
  - **Production build on port 3100** (not 3000: Next allows a single dev server per project). A server already listening there is reused, so for quick reruns start it once with `set -a; source .env.demo.local; set +a; npx next start -p 3100`; otherwise each run builds first (~1 min). Serial, one worker, system Chrome (`channel: 'chrome'`).
  - **Selectors by role and label**, never by class: the tests also check that the UI is reachable for assistive technology. A fixture (`e2e/fixtures.ts`) sets `sessionStorage.sp-splash` so the splash does not cover the page; the splash tests turn it off with `test.use({ skipSplash: false })`.
  - **Cleanup:** every partido the tests publish carries `e2e-` in its comment and `afterAll` deletes them with the service role, even if a test failed halfway.
  - **CI:** the main workflow (`ci.yml`) does not run them. `.github/workflows/e2e.yml` does, by hand (`gh workflow run e2e.yml`) and every Monday, against the demo; it needs the repository secrets `DEMO_SUPABASE_URL`, `DEMO_SUPABASE_ANON_KEY`, `DEMO_SUPABASE_SERVICE_ROLE_KEY` and `DEMO_PASSWORD` (set by the user, never in the chat). Not on every push on purpose: shared database and a slow Supabase would turn the repository red for no reason. Unit tests still never talk to Supabase.
  - Random algorithms: assert invariants over several runs, never exact outputs, and run the suite a few times to catch flakiness.

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
- Git worktrees (e.g. to ship a hotfix from `main` while a feature branch has uncommitted work): `next build` fails there with a symlinked `node_modules` (Turbopack refuses symlinks pointing outside the root). Build in the main checkout or install dependencies in the worktree.
- zsh gotcha: unquoted variables are **not** word-split (`git push origin --delete $LIST` silently did nothing, and `env $VAR_STRING cmd` does not work either): use a `for` loop, or `bash -c "export A=1 B=2; cmd"` when sweeping parameters.

## Release status (2026-10-07)

`v1.0.0` is in production: the redesign (Emotion, public home, partidos with comment/guests/settled players, waiting list, editable and redoable published draws, auto-close of pending matches, clubs/courts, splash, share image). Done on release day: security hardening applied and verified, hourly `pg_cron` close job scheduled, public sign-ups disabled, weekly cron registered (it fires Wednesdays at 22:xx Madrid and creates next Wednesday's event), 40 branches deleted (backup bundle kept by the user). A historic match was corrected (score 2-0 to 4-6) by replaying its rating chain with a backup first.
Parked: a blank list reported after confirming a result in the draw view could not be reproduced without a session (the user asked to leave it until they say otherwise). Cleanup to do now that it has settled: stale "Legacy dialog (Tailwind)" comments, unused `public/*.svg`, one-off scripts in `src/scripts` (keep `retroactive-match-weight.ts`, `create-admin.js` and `seed-demo.ts`), maybe rename `components/dashboard`. Rotate `CRON_SECRET`, revoke the Supabase access token used for the demo.

---

## Demo environment

A fictional copy for showing the app (portfolio, recruiters) without exposing the real group: **https://star-point-demo.vercel.app**.
- **Data**: Supabase project `dibjelontnvnqdqaljqo` (the real one is `idnovsdkodfxaumkbosy`; never mix them up). Built from `supabase/supabase_schema_full.sql` plus `src/scripts/seed-demo.ts`: 16 Springfield characters, 8 past mixings with a real draw and real ELO (the shown ratings are an Elo replay, so they match what the app would compute), a published draw, an open mixing, two partidos, one exclusion and 3 fictional clubs. **Nothing real shows up**: the mixings are titled "Mixing de Springfield" (`DEMO_MIXING_TITLE` in `src/lib/event-title.ts`; the new-event form proposes it when `NEXT_PUBLIC_DEMO=true`, production keeps the group's own title) and the example in the AI box uses the first club of the list.
- **Dates that do not expire.** The published draw is dated *last* Wednesday with its results still to be entered (a draw in that state never expires: the home keeps showing "Resultados pendientes" and the "Acción pendiente" cards, which is the core flow), and the open mixing and the two partidos are `HORIZON_DAYS` (728 = 104 weeks) ahead, so the demo needs no weekly refresh. **Re-seed before that date passes (autumn 2028).** The sign-ups of the open mixing are dated in the past, never from the event date, or whoever joins today would sort before the seeded players. Events of another year show it ("oct ’28" in the lists, "… de 2028" on the page: `formatEventMonth` and `formatEventDate`), otherwise a far partido looks like a past one under "Lo que viene". Accounts: `demo@example.com` (player) and `admin-demo@example.com` (admin), password = `DEMO_PASSWORD`. Public sign-up is disabled.
- **Seed script**: `npx -y tsx src/scripts/seed-demo.ts` (dry run, writes nothing), `--apply`, `--apply --reset` to rebuild. It reads **only** `.env.demo.local` (git-ignored: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `PUSH_DISABLED=true`, `DEMO_PASSWORD`) and refuses to run unless the URL is the demo project's.
- **Deployment**: Vercel project `star-point-demo`, connected to the same repository, so a push to `main` deploys both. Its env vars are the demo's own, plus `NEXT_PUBLIC_DEMO=true`, which shows `DemoBanner`, makes `create-weekly-event` and `generate-draws` skip and enables the AI partido filler (with `ANTHROPIC_API_KEY`; `AI_MATCH_PARSER=false` while there are no API credits). No VAPID keys, no `pg_cron`.
- **Never run `vercel link` in this directory** (it would point production deploys to the demo). Target the demo only per command with `VERCEL_ORG_ID=<team> VERCEL_PROJECT_ID=<demo project id>`; project settings and env vars go through `vercel api` (the CLI's own session). Secrets are piped from the env file to Vercel, never printed.
- **MCP**: two Supabase servers with different names: `supabase` (production) and `supabase-demo` (user scope, `--project-ref` of the demo). **Name the project before every change** and double-check it with `get_project_url`. Production data and DDL need the user's explicit approval; the demo is for experiments.
