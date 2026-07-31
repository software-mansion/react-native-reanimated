---
name: reanimated-css-migration
description: "Converts React Native Reanimated hook-based animations into CSS animations and transitions. Use when migrating, converting or porting Reanimated animations to CSS. Use when replacing useAnimatedStyle, useSharedValue, withTiming, withRepeat or withSpring with animationName or transitionProperty. Use when auditing which animations could become CSS. Use this even if the user never says CSS, whenever they ask to simplify, modernize or remove worklets from animation code."
license: MIT
compatibility: Requires Reanimated 4.x and the New Architecture
---

# Reanimated hooks to CSS migration

Convert only where behavior is identical. Changed timing, interruption or
platform coverage is a defect. Coverage is not the goal.

Source shapes you may convert: open, reason about code not listed here.
Conditions that permit conversion: closed, never migrate past a failed
precondition or a refusal.

## Silent failures

None throw, warn, or fail a typecheck or test. All look correct in a diff.

| Condition | Action |
| --- | --- |
| Driver written in a worklet | Refuse. React state from the UI thread costs a `scheduleOnRN` hop per update |
| React Native renders the property where CSS cannot animate it | Refuse. Works today, stops after; dropped with no warning |
| Value changes every frame | Refuse. As state, every change re-renders |
| Shared value written in `useEffect` or a plain JS callback | Convert it to state and migrate |
| Emitting any animation or transition | Set `animationDuration` / `transitionDuration`. Both default to 0, which discards the motion |
| Emitting an animation that should stay where it lands | Set `animationFillMode: 'forwards'`. Default `none` snaps back. Transitions have no fill mode |

## References

Load at most one per question.

| File | Read when |
| --- | --- |
| `references/preconditions.md` | Deciding whether a call site may be migrated |
| `references/refusals.md` | A pattern looks unmigratable and you need the reason and advice |
| `references/examples.md` | Calibrating what a conversion looks like |
| `references/api-map.md` | Mapping a `with*`, or choosing transition vs animation |
| `references/timing-functions.md` | Converting an `Easing.*` value or a spring |

Property support:
[supported properties](https://docs.swmansion.com/react-native-reanimated/docs/guides/supported-properties).
API signatures:
[CSS Animations](https://docs.swmansion.com/react-native-reanimated/docs/category/css-animations),
[CSS Transitions](https://docs.swmansion.com/react-native-reanimated/docs/category/css-transitions).

## Scale to the request

| Request | Run |
| --- | --- |
| One call site in front of you | Phase 2 only. No inventory, report or ledger |
| "Can this be CSS?", no edit asked for | Phase 2 reasoning, no edits |
| A directory, feature or app | All phases |

Preconditions, refusals and the property check apply at every size.

## Phase 0: before starting

| Check | Then |
| --- | --- |
| Installed Reanimated version | On 3.x, stop and say so. Do not upgrade as part of this work |
| Working tree | Require clean, or explicit acknowledgment the changes are the user's |
| Target platforms, from package.json, app config, web bundler config | Record them; every property decision depends on it |
| Scope | Agree it. Never touch files outside |

Infer what you can. Batch genuine questions into one message.

## Phase 1: inventory

Find every `useAnimatedStyle`, `useAnimatedProps`, `useDerivedValue` and `with*`
call site in scope. Per site record: file, component, animated properties,
driver, effective platforms.

Report counts before continuing. Nothing migratable, say so and stop.

## Phase 2: classify

Per call site:

1. Run `references/preconditions.md`. All 7 must pass.
1. Check every animated property against the table in `references/refusals.md`
   for that site's effective platforms.
1. Label migratable, needs-review, or refused. Judgment calls go to
   needs-review.

**Name the precondition permitting each migration.** Cannot name one, do not
migrate.

## Phase 3: report, before editing

Print as ordinary text. Not a plan object, not a collapsed block. No diff per
site. Do not edit until the user agrees.

1. **Counts.** Migratable, needs-review, refused.

1. **Table, no code**, one row per site:

   | File | Animates | Becomes | Note |
   | --- | --- | --- | --- |
   | `Card.tsx:34` | opacity, translateY on mount | animation | fillMode forwards |
   | `Toggle.tsx:12` | backgroundColor on press | transition | shared value becomes state |

1. **Refusals grouped by reason**, with counts. Forty gesture-driven components
   are one line.

1. **Before and after for 2-3 representative sites**, covering the shapes in the
   table.

## Phase 4: apply

Migrate 3 differing sites first, compare, resolve disagreements before
continuing.

Keep a status file on disk: every site as pending, done or refused, with its
precondition or refusal reason. Conversation memory does not survive compaction;
after an interruption trust the file and `git diff`, not recall.

Then per call site:

| Do | Do not |
| --- | --- |
| Satisfy all 5 equivalence obligations | Leave an obligation unchecked |
| Remove shared values, hooks, imports the conversion killed | Remove anything else |
| Migrate inside each `Platform.select` arm, keeping structure | Collapse the arms |
| Suggest `shadow*` to `boxShadow` in the report | Swap one API for another in this diff |

Checkpoint per file: one line on what changed, then let the user stop you.

Stop and ask when a site differs from the agreed plan: an unspotted property, a
driver that is a worklet after all, an obligation you cannot satisfy.

## Phase 5: verify

1. Typecheck and lint changed files.
1. Watch the animation run. Static checks catch none of the silent failures.
1. Watch the first frame, and re-trigger once. Missing fill mode and dead
   drivers surface there.

Report what you verified and what you did not. Did not run the app, say so.

## Rules

| Rule | Reason |
| --- | --- |
| Default to not migrating; an unrecognized shape is a refusal for manual review | A wrong conversion is silent |
| Say hooks stay correct for gesture-, scroll-, measurement-driven and imperative animation | The output should read as advice, not limitation |
| Never emit `transitionProperty: 'all'` | Enumerate what changes |
| Hoist keyframe objects out of render | A new object each render restarts the animation |
| Bare numeric durations are milliseconds | `300` is 300ms |
| Go straight to a phase if the user asks about one | |
