# NextSesh

Personal workout tracking app. Solo use, Android target.

## Stack

- **Expo + React Native** — app shell
- **expo-router** — file-based navigation (`app/`)
- **expo-sqlite** — persistent storage, source of truth
- **Zustand** — in-memory state (`src/stores/`)
- **NativeWind** — Tailwind styling

## Architecture

```
app/                routes — screens call stores + services
src/stores/         Zustand: sessionStore, settingsStore, timerStore
src/services/       templateService, sessionService, progressionService,
                    notificationService, settingsService
src/db/             client.ts (singleton), migrations.ts (PRAGMA user_version)
src/utils/          progression.ts (pure logic), formatters.ts, constants.ts
src/components/     ExerciseCard, SetRow, WorkoutCard, ProgressionModal,
                    HistoryItem, WorkoutCalendar, DraggableExerciseList, RestTimerOverlay
src/types/index.ts  all TypeScript interfaces
```

- **stores** own in-memory active-session state.
- **services** own all SQLite access.
- **SQLite is the source of truth** for everything persisted; stores are a working copy.

## Rules

1. **All DB access goes through `src/services/`** — screens and stores never call `db.runAsync`, `db.getFirstAsync`, or `db.getAllAsync` directly.
2. **Row converters** (snake_case DB → camelCase TS) live in the same service file as the query that uses them. Shared converters go in `src/services/serviceUtils.ts`.
3. **Stores own in-memory active-session state only** — `settingsStore` and all other stores call `settingsService` / the relevant service; no raw SQL in stores.
4. **Services do not wrap in try/catch** — errors propagate to callers.
5. **Wrap multi-row writes** (any loop of `INSERT`/`UPDATE`) in `db.withTransactionAsync`.
6. **Schema changes via migrations only** — never `ALTER TABLE` outside a migration. Bump `PRAGMA user_version`. Never edit an already-applied migration.
7. **Styling: NativeWind `className`** — use inline `style={{}}` only for values outside the Tailwind theme (e.g. dynamic hex colors).
8. **Progression guard** — `applyProgression` must check `exercise.progEnabled` before running; skip silently if false.
9. **List-item components** (`HistoryItem`, `WorkoutCard`) must be wrapped in `React.memo` — they appear in FlatLists and re-render on every parent update otherwise.
10. **`resetAllProgression` must clear set targets** — after resetting `target_reps` on `exercise_templates`, also clear all rows in `exercise_set_targets` (nullify values, set `is_modified = 0`). Otherwise stale per-set overrides survive the reset and show phantom yellow highlights.
11. **Deleting an exercise must clear its set targets first** — `exercise_set_targets` has no cascade delete from `exercise_templates`. Either delete targets explicitly before deleting the exercise, or add a cascade via a future migration. Do not leave orphan rows.

## Database

- `src/db/client.ts` — singleton DB connection (`getDB()`).
- `src/db/migrations.ts` — sequential migrations gated on `PRAGMA user_version`. Current version: **6**.
- `exercise_set_targets` rows are cleared by `progressionService` after auto-progression runs and by `resetAllProgression`. They have no cascade delete — deleting an exercise must explicitly delete its targets first.

## Progression system

Controlled per-exercise via `progEnabled`. Falls back to global settings defaults when per-exercise values are null. All logged sets for an exercise count toward progression (there is no per-set opt-out).

- **`weight_reps`** — if all sets completed AND `curReps >= repMax`: add `progWeightIncrement`, reset reps to `repMin`. Otherwise: reps +1.
- **`bodyweight_reps`** — if all sets completed AND `curReps >= repMax`: already at ceiling, do nothing (no weight bump, no rep reset). Otherwise: reps +1.
- **`weight_time`** — if `curDuration >= durMax`: add weight, reset to `durMin`. Otherwise: duration +5s.
- Per-set overrides (`exercise_set_targets`) are cleared after progression runs.

Pure logic: `src/utils/progression.ts`. DB wiring: `src/services/progressionService.ts`.
