---
name: reanimated-css-migration
description: "Converts React Native Reanimated hook-based animations into CSS animations and transitions. Use when migrating, converting or porting Reanimated animations to CSS. Use when replacing useAnimatedStyle, useSharedValue, withTiming, withRepeat or withSpring with animationName or transitionProperty. Use when auditing which animations could become CSS. Use this even if the user never says CSS, whenever they ask to simplify, modernize or remove worklets from animation code."
license: MIT
compatibility: Requires Reanimated 4.x and the New Architecture
---

# Reanimated hooks to CSS migration

Convert only where the result is behaviorally identical. Changed timing,
interruption or platform coverage is a defect, even if the animation still looks
roughly right. Coverage is not the goal.

Which source shapes you may convert is open: reason about code not listed here.
Which conditions permit conversion is closed: never migrate past a failed
precondition or a refusal.

## Four silent failures

None of these throw, warn, or fail a typecheck or test. All look correct in a
diff.

Do not migrate when:

- **The driver is written in a worklet.** Gesture callbacks, `useAnimatedReaction`,
  `useFrameCallback`, scroll handlers and sensors run on the UI thread. Reaching
  React state from there costs a `scheduleOnRN` hop per update.
- **React Native renders the property where CSS cannot animate it.** It works
  today and stops after. Unsupported properties are dropped with no warning.
- **The value changes every frame.** As state, every change re-renders. Migrate
  discrete changes, not streams.

A shared value written from `useEffect` or a plain JS callback is the opposite
case: convert it to state and migrate.

Always, in every conversion you apply:

- **Set a duration**, `animationDuration` or `transitionDuration` to match what
  you emitted. Both default to 0, which discards the motion.
- **Set `animationFillMode: 'forwards'` on animations** that should stay where
  they land. The default `none` snaps back to the start. Transitions have no fill
  mode; adding one does nothing.

## References

Load at most one per question.

| File | When to read |
| --- | --- |
| `references/preconditions.md` | Deciding whether a call site may be migrated |
| `references/refusals.md` | A pattern looks unmigratable and you need the reason and the advice |
| `references/examples.md` | Calibrating what a good conversion looks like |
| `references/api-map.md` | Mapping a `with*` or `Easing.*` value, or choosing transition vs animation |

Property support:
[Supported style properties](https://docs.swmansion.com/react-native-reanimated/docs/guides/supported-properties).
API signatures:
[CSS Animations](https://docs.swmansion.com/react-native-reanimated/docs/category/css-animations),
[CSS Transitions](https://docs.swmansion.com/react-native-reanimated/docs/category/css-transitions).

## Scale the process to the request

| Request | Do |
| --- | --- |
| One call site, already in front of you | Phase 2 only. Convert or explain. No inventory, report or ledger |
| "Can this be CSS?", no edit requested | Phase 2 reasoning, no edits |
| A directory, feature or app | Full sequence |

Preconditions, refusals and the property check apply at every size. Everything
else scales.

## Before you start

1. Read the installed Reanimated version. On 3.x, stop and say so. Do not
   upgrade as part of this work.
1. Require a clean working tree, or explicit acknowledgment that uncommitted
   changes are the user's.
1. Determine target platforms from package.json, app config and web bundler
   config. Record them; every property decision depends on it.
1. Agree the scope. Never touch files outside it.

Infer what you can. Batch genuine questions into one message.

## Phase 1: inventory

Find every `useAnimatedStyle`, `useAnimatedProps`, `useDerivedValue` and `with*`
call site in scope. Record file, component, animated properties, driver, and
effective platforms.

Effective platforms narrow to:

- the suffix, for `.ios` / `.android` / `.web` / `.native` on js, jsx, ts, tsx
- the branch, inside `Platform.OS` or a `Platform.select` arm

Report counts before continuing. If nothing is migratable, say so and stop.

## Phase 2: classify

Work each call site through `references/preconditions.md`. Every precondition
must hold; the first failure is the reason you report.

**Name the precondition that permits each migration.** Cannot name one, do not
migrate. This is what keeps an open transformation set safe.

Check every animated property against the table in `references/refusals.md` for
that site's effective platforms. Single-platform support is not itself a
problem; what matters is whether React Native renders it where CSS cannot.

Label each site migratable, needs-review, or refused. When weighing a judgment
call, choose needs-review.

## Phase 3: report before editing

Print as ordinary text. Not a plan object, not a collapsed block. Do not edit
until the user agrees.

Never paste a diff per site. Report three parts:

1. **Counts.** Migratable, needs-review, refused.

1. **A table, no code**, one row per site:

   | File | What it animates | Becomes | Note |
   | --- | --- | --- | --- |
   | `Card.tsx:34` | opacity, translateY on mount | animation | fillMode forwards |
   | `Toggle.tsx:12` | backgroundColor on press | transition | shared value becomes state |

1. **Refusals grouped by reason**, with counts. Forty gesture-driven components
   are one line, not forty.

Then show before and after for two or three representative sites only, covering
the different shapes in the table.

Let the user narrow the list before applying anything.

## Phase 4: apply

Migrate three differing call sites first and compare. Resolve any disagreement
between them before continuing: fixing the approach after three files is cheaper
than after thirty.

Keep a status file on disk listing every site as pending, done or refused, with
its precondition or refusal reason. Update it as you go. Conversation memory does
not survive compaction; after any interruption trust the file and `git diff`, not
recall.

Then, one call site at a time:

- Satisfy every equivalence obligation in `references/preconditions.md`.
- Remove the shared values, hooks and imports the conversion made dead, and
  nothing else.
- Keep `Platform.select` structures as written; migrate inside each arm.
- Never swap one API for another. `shadow*` to `boxShadow` is a separate
  refactor. Suggest it in the report; keep it out of the diff.

Checkpoint per file: one line on what changed, then let the user stop you. Per
call site is noise; only at the end means the mistake already repeated thirty
times.

Stop and ask whenever a site differs from the agreed plan: an unspotted
property, a driver that turns out to be a worklet, an obligation you cannot
satisfy.

## Phase 5: verify

1. Typecheck and lint the changed files.
1. Watch the animation run. Static checks catch none of the four silent
   failures, so this is the only real evidence.
1. Watch the first frame, and re-trigger once. That is where a missing fill mode
   and a dead driver surface.

Report what you verified and what you did not. If you did not run the app, say
so plainly.

## Rules

- Default to not migrating. An unrecognized shape is a refusal for manual
  review, never a guess.
- Hooks stay correct for gesture-, scroll-, measurement-driven and imperative
  animation. Say so when refusing, so the output reads as advice.
- Never emit `transitionProperty: 'all'` instead of working out which properties
  change.
- Hoist keyframe objects out of render. A new object each render restarts the
  animation.
- If the user asks about one phase, go straight to it.
