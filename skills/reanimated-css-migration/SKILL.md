---
name: reanimated-css-migration
description: "Converts React Native Reanimated hook-based animations into CSS animations and transitions, applying the conversions that are provably safe and leaving the rest for the user to decide on. Use when migrating, converting or porting Reanimated animations to CSS. Use when replacing useAnimatedStyle, useSharedValue, withTiming, withRepeat or withSpring with animationName or transitionProperty. Use when auditing which animations could become CSS. Use this even if the user never says CSS, whenever they ask to simplify, modernize or remove worklets from animation code."
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
| Emitting any animation or transition | Set the duration, default 0 discards the motion. Set the timing function too: it defaults to `'ease'`, not the `withTiming` default of `Easing.inOut(Easing.quad)` |
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
| One call site in front of you | Phase 2, then convert or explain. No inventory, ledger or tables |
| "Can this be CSS?", no edit asked for | Phase 2 reasoning only. Never edit |
| A directory, feature or app | All phases |

Preconditions, refusals and the property check apply at every size.

## Phase 0: before starting

| Check | Then |
| --- | --- |
| Installed Reanimated version | On 3.x, stop and say so. Do not upgrade as part of this work |
| Reanimated < 4.4 with SVG in scope | Refuse the SVG sites. `EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS` defaults false before 4.4, so the CSS is dropped with no warning |
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

## Phase 3: apply the certain set

Apply migratable sites without asking. Leave needs-review and refused untouched.
The user reviews a diff, not a plan, so the bar for "migratable" is the whole
safety model: all 7 preconditions pass, every property clears, and you can name
the permitting precondition. Anything you are weighing goes to needs-review and
is not edited.

Require a clean working tree first, or explicit acknowledgment. `git diff` is
the user's undo.

Migrate 3 differing sites first and compare. Resolve any disagreement between
them before continuing: a systematic mistake caught after 3 files is cheap,
after 30 it is not.

Keep a status file on disk: every site as pending, done, needs-review or
refused, with its precondition or reason. Conversation memory does not survive
compaction; after an interruption trust the file and `git diff`, not recall.

Then per call site:

| Do | Do not |
| --- | --- |
| Satisfy all 5 equivalence obligations | Leave an obligation unchecked |
| Remove shared values, hooks, imports the conversion killed | Remove anything else |
| Migrate inside each `Platform.select` arm, keeping structure | Collapse the arms |
| Note `shadow*` to `boxShadow` for later | Swap one API for another in this diff |

Downgrade to needs-review and revert that site if anything turns up mid-edit
that the classification missed: an unspotted property, a driver that is a
worklet after all, an obligation you cannot satisfy. Do not push through.

## Phase 4: report what changed and what did not

Report after applying, as ordinary text. Not a plan object, not a collapsed
block.

Lead with both numbers in one line, for example: `Migrated 14 sites across 9
files. Left 23: 6 need a decision, 17 refused.` The user must see the size of
what was skipped without reading further.

1. **Applied.** File and what each became, one row per site. No diffs, the diff
   is in the working tree.

   | File | Animates | Became | Note |
   | --- | --- | --- | --- |
   | `Card.tsx:34` | opacity, translateY on mount | animation | fillMode forwards |
   | `Toggle.tsx:12` | backgroundColor on press | transition | shared value became state |

1. **Needs review, not applied.** One row per site with the specific question
   the user has to answer, since these are the ones they can act on.

   | File | Animates | Blocked on |
   | --- | --- | --- |
   | `Sheet.tsx:88` | height on expand | `interpolate` extrapolates past its range |

1. **Refused, grouped by reason**, with counts. Forty gesture-driven components
   are one line, not forty.

1. **Before and after code for 2-3 applied sites**, covering the different
   shapes in the table. Write it out; never promise a sample and omit it.

Then ask which of the needs-review sites to take, offering the list by number so
the user can answer "1, 3 and 5" or "none". Apply only what they name.

Keep out of this report: equivalence obligations to re-check, memoization
advice, reduced-motion recipes. Prose per site crowds out the code section and
makes the tables unscannable.

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
| Hoist keyframe objects out of render | Keyframes are keyed by content, so a rebuilt identical object is only waste. One whose content varies per render does restart the animation |
| Bare numeric durations are milliseconds | `300` is 300ms |
| Go straight to a phase if the user asks about one | |
