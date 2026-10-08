# starpoint · Case study

🌐 [Leer en español](caso-de-estudio.md)

> A PWA for a real padel group: pair draws that avoid repeats, an ELO ranking adapted to doubles, published matches to find players, and results validated between opponents. In production since July 2026, with about 30 players.

<p align="center">
  <img src="social-preview.png" alt="starpoint · Tu app de Pádel" width="640">
</p>

<p align="center">
  <img src="img/02-inicio.png" alt="Home: your events and matches" width="190">
  <img src="img/03-mixing.png" alt="A mixing: who is coming and how to sign up" width="190">
  <img src="img/04-sorteo.png" alt="The draw: your court, your partner and your opponents" width="190">
  <img src="img/05-publicar-partido.png" alt="Publishing a match with a comment" width="190">
</p>

<p align="center">
  <sub>Home · Mixing · Draw · Publish a match &nbsp;(demo with fictional data; the app itself is in Spanish)</sub><br>
  ▶ <a href="img/demo.mp4"><b>Video walkthrough</b></a> (67 s) · <a href="https://star-point-demo.vercel.app"><b>Live demo</b></a>
</p>

| | |
|---|---|
| **Status** | In production · version 1.0.0 (October 2026) |
| **Real usage** | A group of about 30 players, one mixing per week and one-off matches; more than 130 confirmed matches in the history |
| **My role** | Design, development, database, deployment and operations (solo project) |
| **Stack** | Next.js 16 (App Router) · React 19 · strict TypeScript · Emotion · Supabase (PostgreSQL, Auth, Realtime, RLS) · Vercel · Web Push · Vitest |

---

## 1. The problem

Every week the group organised its "mixing" over WhatsApp: a dozen people, three courts and three rounds in which everyone plays with and against everyone else. Doing the draw by hand had three problems:

- **Partners and opponents repeated**, and the same combinations kept coming up.
- **Matches were unbalanced** (a very strong player with a very weak one against two intermediates), and nobody wanted to be the one deciding.
- **There was no memory**: results got lost in the chat, there was no ranking, and any argument about "who won" went unresolved.

On top of that, someone had to manage who signs up, who is on the waiting list, who drops out at the last minute and when to notify everyone.

## 2. The solution

An installable mobile app (PWA) with two main flows:

**Weekly mixing**
- Sign-up with a **waiting list**: starters and reserves in order of sign-up, with automatic promotion when someone withdraws.
- A **draw** of partners and opponents for every round, with a summary of repeats before publishing.
- Each player sees **only their own match**, and the view moves by itself to their current round according to the clock.
- The admin can edit, redo or cancel the draw, change a match's court, and swap pairs on a court if the four players agree.
- A cron job creates next week's event automatically.

**Matches**
- Any player can publish a match (club, day, time, how many players are missing and a free comment) and the group is notified by push.
- The screen always shows the four slots: the organiser, the players already confirmed, those who sign up and the free ones.
- The organiser can add players from outside the group.

**Results and ranking**
- One player enters the score and **the opponent confirms or corrects it**. If nobody answers within 24 hours, the last score entered is accepted.
- Confirming updates the ELO of the four players, their history and their statistics.

## 3. Architecture

```
Browser / PWA (mobile)
   │   Server Components + Server Actions (Next.js App Router)
   ▼
Next.js on Vercel ──────────────► Supabase
   │  • dynamic pages                  • PostgreSQL with RLS
   │  • DTOs built on the server       • Auth (SSR cookies)
   │  • weekly cron (Vercel)           • Realtime (live changes)
   │  • protected closing endpoint     • Atomic RPCs (SECURITY DEFINER)
   ▲                                   • pg_cron + pg_net (hourly closing)
   │
Service Worker ◄── Web Push (VAPID)
```

Server pages query the database, build **plain objects containing only what each user is allowed to see** and pass them to client components. Permissions are always checked on the server, against the user's real role.

## 4. Technical decisions

### 4.1 A draw with explicit priorities

The goal was clear: everyone plays with and against everyone, with no repeats. But with groups of four, **there are mathematical limits**: with 12 players and 3 rounds it is impossible to avoid rematches (the minimum is 9), while with 16 players you can reach zero. The algorithm had to be honest about that and not promise the impossible.

I solved it with a **cost hierarchy**, from most to least important:

1. **Hard:** the configured exclusions (for example, "these two never play together") and repeating a partner within the event. Only broken if no combination of the group avoids it.
2. **Strong:** meeting again on the same court within the same event.
3. **Soft:** level (balanced pairs and similar averages between courts), which weighs more than what happened at the previous event.
4. **Softer:** repeating what happened at the previous event.
5. **Tie-break:** court position (drive and backhand side).

It is solved in two layers: a planner of groups of four for each round (random start, local search by swaps and several restarts) and, inside each group, the choice of the best of the three possible pairings. Warnings to the admin only talk about repeats **within the event**, and only when the *same* relationship repeats: having been partners and then opponents is not a failure.

**How I checked it:** the tests do not compare exact results (the algorithm is random). They check **invariants** over many repeated runs: a partner is never repeated, 12 players over 3 rounds never exceed 10 rematches, and 16 over 3 rounds reach zero. I tuned the weights by simulating hundreds of draws with the real history of a previous event.

### 4.2 An ELO designed for doubles padel

A standard ELO did not fit: here two play against two, with many one-off matches and new players. The calculation includes:

- **Dynamic K:** more volatile for players with fewer than 10 matches.
- **Margin-of-victory weight:** winning 8-2 is not worth the same as 6-5.
- **Disparity filter:** if the teams are very unequal, the match barely counts.
- **Damping at the top end** and limits from 0 to 7.
- **Guest protection:** no real player loses rating if a guest is in the match.

The parameters live in a single configuration file. After three weeks of real use I saw that levels were barely separating, so I **raised the margin weight from 0.40 to 0.70**. I did not do it by eye: I compared several candidates by simulating the effect on the spread of ratings *and* on the quality of the resulting draws, and applied the change **retroactively** with a script that first simulates (dry run) and only writes after confirmation.

### 4.3 Confirming a result is an atomic operation

Confirming a match changes four profiles, their history and the match itself. If it fails halfway, the ranking is corrupted. That is why it is **a single PostgreSQL function** (`confirm_match_atomic`), with row locking and protection against double confirmation, and it is the *only* place where ratings and statistics are written. The user action and the automatic closing reuse the same logic.

### 4.4 Security and privacy enforced on the server

- **Players never see other players' level**, only their court position. This is not solved by hiding it in the interface: the data **never reaches the browser**, because the objects sent are built without it.
- In a draw, each player receives only their own match. Visitors only see counts (no names).
- The `SECURITY DEFINER` functions had a subtle flaw: with a visitor without a session, `auth.uid()` is null and comparisons such as `IF a <> b` evaluate to null (neither true nor false), so **the permission check was skipped**. I fixed it by explicitly rejecting anonymous calls, revoking privileges and closing public read access to profiles, matches and history.
- **How I verified it without touching real data:** I ran the function inside a block that ends with a deliberate error, which forces the whole transaction to roll back. I tested three cases (visitor, user outside the match, admin) and then checked that nothing had been saved.

### 4.5 Automatic closing of matches

If an opponent does not reply, the match cannot stay in limbo. A scheduled job in Supabase (`pg_cron` + `pg_net`) calls a protected endpoint of the application every hour. The endpoint confirms results left unanswered after 24 hours and expires matches that never got a score. It reuses the same confirmation code as the user action.

### 4.6 From utility CSS to my own design system

I migrated the whole interface from **Tailwind + shadcn to Emotion**, with theme tokens (colours, radii, shadows, typography) in a single file and components organised into atoms, molecules and organisms. Details worth mentioning:

- **No flash between light and dark theme:** page colours switch through CSS variables and a class applied before the first paint.
- **Server-side rendering of styles** through an Emotion cache, to avoid the style jump on load.
- **Server Components cannot use `styled`**, so styles live in client components and server pages only assemble data.
- A single-column interface designed for mobile only: no breakpoints, with specific adjustments for iOS (for example, date and time fields).

### 4.7 A PWA with attention to detail

- **The icon is drawn from code** (`next/og`) and is the single source for the icon, the favicon, notifications and the link-sharing image.
- **Animated welcome screen** that only appears on the first load of the session; a small script decides *before the first paint* whether to show it, so it never flickers.
- **Push notifications** with a service worker and a kill switch to disable them when testing against real data.
- **Updates without reloading:** Supabase Realtime refreshes screens when something changes, and a single timer refreshes exactly when a match starts or ends, without polling the database.

## 5. Quality and way of working

- **Continuous integration** on GitHub Actions: `tsc`, `eslint`, tests (Vitest) and `next build` on every PR.
- **Tests on the riskiest logic:** ELO, the draw algorithm and date utilities with the Madrid time zone (a real bug around the clock change is pinned in a test).
- **Migrations as versioned SQL files**, applied carefully with read-only checks before and after.
- **Preview deployments** on every push, a tagged release (`v1.0.0`) and conventional commit messages.
- **Living documentation** (`AGENT.md`) with decisions, privacy rules and lessons learned, so that any collaborator, human or assistant, can pick the project up without losing context.

## 6. Mistakes that taught me something

- **A delete that did not delete.** A table without a `DELETE` policy makes a delete by a normal user **raise no error, but remove nothing**. It left orphaned data and a "matches already generated" message. Now every delete of this kind runs after authorising the user and with the service client.
- **A cron pointing at a route that did not exist.** I found it by listing the jobs *actually registered* on the platform and not just reading the configuration file: for days it had created no event.
- **An invisible permissions bug in a function with `NULL`.** Described above: the dangerous part was not that it failed, but that it looked like it worked.
- **Correcting a historical result with a chain of effects.** When an old result had to change, the ELO of the players involved and of every later match depended on it. I solved it by **replaying the affected chain**: I first validated the model against the whole history (535 of 540 calculations exact), simulated, made a backup and applied only the difference, so as not to alter anyone with earlier discrepancies.

## 7. What I would improve

- **End-to-end tests** (today the pure logic is tested, not the full flows).
- Finer-grained notifications (reminders before a match), if the group asked for them: for now they are not needed.

A demo environment with fictional data, originally on this list, is now live: [star-point-demo.vercel.app](https://star-point-demo.vercel.app).

## 8. Stack and structure

| Layer | Technology |
|---|---|
| Interface | Next.js 16 (App Router), React 19, Emotion, Lucide, Radix UI (primitives) |
| Forms | React Hook Form + Zod |
| Data and authentication | Supabase: PostgreSQL, Auth with SSR cookies, Realtime, RLS |
| Business logic | Strict TypeScript: draw algorithm, ELO, match lifecycle |
| Real time and notifications | Supabase Realtime, Web Push (VAPID), service worker |
| Operations | Vercel (deployment and weekly cron), `pg_cron` + `pg_net` (automatic closing) |
| Quality | Vitest, ESLint, GitHub Actions |

```
src/
├── app/          # routes, server actions and cron endpoints
├── components/   # atoms · molecules · organisms (own design system)
├── lib/          # draw, ELO, match confirmation, date utilities
└── utils/        # Supabase clients (browser, server and service)
```

More technical details and project rules in [AGENT.md](../AGENT.md); installation and environment variables in the [README](../README.md).
