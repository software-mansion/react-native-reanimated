---
name: reanimated-css-migration
description: "Converts React Native Reanimated hook-based animations into CSS animations and transitions. Use when migrating, converting or porting Reanimated animations to CSS. Use when replacing useAnimatedStyle, useSharedValue, withTiming, withRepeat or withSpring with animationName or transitionProperty. Use when auditing which animations could become CSS. Use this even if the user never says CSS, whenever they ask to simplify, modernize or remove worklets from animation code."
license: MIT
compatibility: Requires Reanimated 4.x and the New Architecture
---

# Reanimated hooks to CSS migration

Converts imperative, worklet-driven animations into Reanimated's declarative CSS
animations and transitions, but only where the result is behaviorally identical.
Coverage is not the goal: a migration that changes timing, interruption or
platform coverage is a defect even when the animation still looks roughly right.

The safety model is deliberately asymmetric: **which source patterns you may
convert is open, which conditions permit conversion is closed.** You are
expected to reason about code shapes not listed here. You are not permitted to
migrate anything that fails a precondition or hits a refusal.

## Failures that produce no error

Four things break an animation without throwing, warning, or failing a typecheck
or a test, and all four look correct in a diff. Two of them mean the call site
must not be converted at all. Two are mistakes in the output of a conversion
that is otherwise fine. Know which is which before you start.

**Do not migrate the call site when:**

- **The driver is written from a worklet.** Gesture callbacks are workletized
  onto the UI thread by default, as are `useAnimatedReaction`, `useFrameCallback`,
  scroll handlers and sensors. Driving React state from there needs a
  `scheduleOnRN` thread hop per update, which is worse than the code you started
  with. A shared value written from `useEffect` or a plain JS callback is the
  opposite case: convert it to state and migrate.
- **React Native renders the property but CSS cannot animate it.** The hook
  version works today and the CSS version stops. Unsupported properties are
  dropped by the props builder with no warning at all.
- **The value changes every frame.** Once it is state, each change re-renders.
  Migrate discrete changes, not streams.

**Get these right in every conversion you do apply:**

- **Always set a duration**, `animationDuration` or `transitionDuration` to match
  whichever mechanism you emitted. Both default to 0, which discards the motion
  entirely.
- **On animations only, set `animationFillMode: 'forwards'`** when the element
  should stay where it lands. The CSS default is `none`, which discards the
  computed value and snaps it back to the start. Transitions have no fill mode
  and need none, because the underlying prop value genuinely changed; adding one
  to a transition does nothing.

## References

Load at most one reference file per question.

| File | When to read |
| --- | --- |
| `references/preconditions.md` | Deciding whether a specific call site may be migrated |
| `references/refusals.md` | A pattern looks unmigratable and you need the reason and the advice to give |
| `references/examples.md` | You need calibration on what a good conversion looks like |
| `references/api-map.md` | Mapping a `with*` function or an `Easing.*` value, or choosing transition vs animation |

For the authoritative list of which style properties animate on which platform,
consult
[Supported style properties](https://docs.swmansion.com/react-native-reanimated/docs/guides/supported-properties).
`references/refusals.md` lists only the properties where CSS is behind React
Native, which is the subset that matters when deciding whether to migrate.

For API signatures and configuration options, consult the
[CSS Animations](https://docs.swmansion.com/react-native-reanimated/docs/category/css-animations)
and [CSS Transitions](https://docs.swmansion.com/react-native-reanimated/docs/category/css-transitions)
documentation.

## Match the process to the request

The phases below are for migrating a codebase or a feature. They are the wrong
shape for a smaller question, and running them anyway is worse than not using
this skill at all.

- **One call site, already in front of you.** Skip to Phase 2. Check the
  preconditions, check the properties, convert or explain why not. No inventory,
  no report, no ledger.
- **"Can this be CSS?" with no request to change anything.** Answer it. Phase 2
  reasoning only, no edits.
- **A whole directory, feature or app.** Run the full sequence.

The preconditions, the refusals and the property check are never optional at any
size. Everything else scales with the request.

## Before you start

1. Read the installed Reanimated version. CSS animations require 4.x and the New
   Architecture. On 3.x, stop and say so; do not attempt the upgrade as part of
   this work.
1. Require a clean working tree, or an explicit acknowledgment from the user
   that uncommitted changes are theirs. They need to be able to diff and revert.
1. Establish the project's target platforms from package.json, app config and
   the presence of web bundler config. Record what you found; every property
   decision depends on it.
1. Agree the scope. A directory, a feature, or the whole app. Never touch files
   outside it.

Infer what you can from the codebase. Ask only about things genuinely
unresolvable, and batch those into a single message.

## Phase 1: inventory

Find every animation call site in scope: `useAnimatedStyle`, `useAnimatedProps`,
`useDerivedValue`, and the `with*` functions.

For each one record the file, the component, the animated properties, what
drives the animation, and the call site's effective platforms. Effective
platforms narrow when the file carries a platform suffix (`.ios`, `.android`,
`.web`, `.native` on any of js, jsx, ts, tsx), or when the code sits inside a
`Platform.OS` branch or a `Platform.select` arm. A `.ios.tsx` file only needs
iOS support.

Report the counts before going further. If nothing is migratable, say so and
stop rather than forcing a conversion.

## Phase 2: classify

For each call site, work through `references/preconditions.md`. Every
precondition must hold. If any fails, the call site is not migratable and the
failing precondition is the reason you report.

**State which precondition permits each migration.** If you cannot name the
condition you are relying on, you have pattern-matched rather than reasoned, and
you must not migrate. This is the single rule that keeps an open transformation
set safe.

Check every animated property against the table in `references/refusals.md` for
the call site's effective platforms. A property covering only one platform is not
automatically a problem: what matters is whether React Native renders it
somewhere CSS cannot animate it.

Classify each site as migratable, needs-review, or refused. Prefer needs-review
over migratable whenever you are weighing a judgment call.

## Phase 3: report before editing

Print the plan as ordinary text in the conversation. Do not bury it in a plan
object or a collapsed block, and do not start editing until the user has agreed
to it.

The plan has to stay readable at thirty call sites, so do not paste a diff per
site. Use three parts:

**A count.** One line: how many sites are migratable, how many need review, how
many are refused.

**A table of what would change**, one row per call site, no code:

| File | What it animates | Becomes | Note |
| --- | --- | --- | --- |
| `Card.tsx:34` | opacity, translateY on mount | animation | fillMode forwards |
| `Toggle.tsx:12` | backgroundColor on press | transition | shared value becomes state |

**Refusals grouped by reason, not by file**, with a count and one explanation
each. Forty gesture-driven components are one line saying forty, not forty
lines. A migration is judged on what it declines and whether it explains itself,
so this is half the output, not an appendix.

Then show the full before and after for **two or three representative sites
only**, picked to cover the different shapes in the table. That is enough for
the user to judge the approach without reading everything.

Let the user narrow the list before you apply anything.

## Phase 4: apply

Before fanning out, migrate three call sites that differ from each other and
compare the results. Correcting your approach after three files is far cheaper
than correcting the same mistake across thirty. If the three disagree about
anything, resolve it before continuing.

Keep progress in a file on disk, not in the conversation, listing every call
site in scope with a status of pending, done or refused, plus the precondition
or refusal reason. Update it as you go. Conversation memory does not survive
compaction, and a migration that loses its place re-edits files it already
finished. After any interruption, trust the file and `git diff` over your own
recollection of what you did.

Migrate one call site at a time. After each one, the component must satisfy
every equivalence obligation in `references/preconditions.md`: same appearance
on first render, same end state, same behavior on re-trigger, interrupt and
unmount, and no other change to what the component renders.

Remove the shared values, hooks and imports that the conversion makes dead, and
nothing else. Keep `Platform.select` structures exactly as the author wrote
them and migrate within each arm; flattening a deliberate platform decision is a
regression regardless of how the animation behaves.

Never rewrite one API into a different one as part of this work. Converting
shadow properties to `boxShadow`, for example, is an independent refactor with
its own visual risk. Suggest it in the report; do not fold it into the diff.

Checkpoint per file, not per call site, and not once at the very end. After each
file, say what changed in one line and let the user stop you. Asking after every
call site is noise in a file with six of them; asking only at the end means a
mistake in the approach has already been repeated thirty times.

Stop and ask, rather than deciding alone, whenever a site turns out to differ
from the plan the user agreed to: a property you had not spotted, a driver that
is a worklet after all, or an equivalence obligation you cannot satisfy.

## Phase 5: verify

1. Typecheck and lint the changed files.
1. Watch the animation run. Static checks cannot detect any of the four failure
   modes above, so this is the only step that constitutes evidence.
1. Watch the first frame specifically, and re-trigger once. Those are where a
   missing fill mode and a dead driver show up.

Report what you verified and what you could not. If you did not run the app, say
so plainly rather than implying the change is confirmed.

## General rules

- Default to not migrating. An unrecognized shape is a refusal needing manual
  review, never a best guess.
- Hook-based Reanimated stays the correct answer for gesture-driven,
  scroll-driven, measurement-driven and imperative animation. Say so when
  refusing, so the output reads as advice rather than a limitation list.
- Never emit `transitionProperty: 'all'` as a substitute for working out which
  properties change.
- Hoist keyframe objects out of render. One created during render is a new
  object every time, which restarts the animation on every re-render.
- If the user asks only about one phase, go straight to it.
