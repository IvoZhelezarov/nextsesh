# NextSesh

Personal workout tracking app. Solo use, Android target.

## Stack

- **Expo + React Native** — app shell
- **expo-router** — file-based navigation (`app/`)
- **expo-sqlite** — persistent storage, source of truth
- **Zustand** — in-memory state (`src/stores/`)
- **NativeWind** — Tailwind styling

## Architecture

Layers, top to bottom:

```
app/                routes (expo-router) — screens call stores + services
src/stores/         Zustand: sessionStore, settingsStore, timerStore
src/services/       templateService, sessionService, progressionService, notificationService
src/db/             client.ts (singleton), migrations.ts (PRAGMA user_version)
src/utils/          progression.ts (pure logic), formatters.ts, constants.ts
src/components/      ExerciseCard, SetRow, WorkoutCard, ProgressionModal,
                    HistoryItem, WorkoutCalendar, DraggableExerciseList, RestTimerOverlay
src/types/index.ts  all TypeScript interfaces
```

- **stores** own in-memory active-session state.
- **services** own all SQLite access.
- **SQLite is the source of truth** for everything persisted; stores are a working copy.

## Conventions

1. **All DB access goes through `src/services/`** — screens never call `db.runAsync` directly.
2. **Row converters** (snake_case DB → camelCase TS) live in the same service file as the query that uses them.
3. **Zustand stores own in-memory active-session state**; SQLite is the source of truth for everything persisted.
4. **Services do not wrap in try/catch** — errors propagate to callers.
5. **Styling: NativeWind `className`.** Use inline `style={{}}` only when the value is not in the Tailwind theme (e.g. dynamic hex colors).
6. **Schema changes via migrations only** — never `ALTER TABLE` manually outside a migration. Bump `PRAGMA user_version`.
7. **Wrap multi-row writes** (loops of `INSERT`/`UPDATE`) in `db.withTransactionAsync`.

## Database

- `src/db/client.ts` — singleton DB connection.
- `src/db/migrations.ts` — 5 migrations, gated on `PRAGMA user_version`. Add a new migration to change schema; never edit an applied one.

## Progression system

Controlled per-exercise via the `progEnabled` flag. Per-exercise prog values fall back to global settings defaults when null.

- **`weight_reps` / `bodyweight_reps`** — if all sets are marked `markProgress=true` AND `curReps >= repMax`, add `progWeightIncrement` to weight and reset reps to `repMin`. Otherwise increment reps by 1.
- **`weight_time`** — if `curDuration >= durMax`, add weight and reset duration to `durMin`. Otherwise add 5s.
- Per-set target overrides (`exercise_set_targets`) are cleared after auto-progression runs.

Pure logic lives in `src/utils/progression.ts`; `progressionService.ts` wires it to the DB.

## Known issues

1. **`resumeSession` (sessionStore.ts)** stamps `startedAt` as `now()` instead of using the original session `startedAt` from DB. Fix: pass `startedAt` param.
2. **Crash-recovery path (app/session/[id].tsx)** calls `initSession` instead of `resumeSession`, so completed sets aren't restored. Fix: fetch `loggedSets` + call `resumeSession`.
3. **`finishSession` (sessionService.ts)** runs `applyProgression` before `saveLastWeightsForSession`, so progression may use stale weight. Fix: call `saveLastWeights` first inside `finishSession`.
4. **`createSession`** hardcodes `'#22c55e'` as fallback `templateColor`; should be null. Fix: `templateColor ?? null`.
5. **`saveSetTargets` and `reorderExercises`** run N serial DB writes without a transaction. Fix: wrap in `db.withTransactionAsync`.
6. **`rowToLoggedSet`** is duplicated in `sessionService.ts` and `progressionService.ts`. Fix: extract to `serviceUtils.ts`.
