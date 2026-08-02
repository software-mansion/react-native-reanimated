# Objective 03 Semantic Contract

Status: accepted in the design session; external sign-offs listed below remain
open.

This document defines observable behavior. It does not prescribe a platform
API or executor implementation.

## Authority and identity

When sources disagree, use this order:

1. Fabric host-state and lifecycle correctness.
2. Documented Reanimated behavior.
3. Repeatable legacy behavior.
4. Native convenience or performance.

An intentional legacy difference must be explicit, tested, and reviewed by the
relevant maintainer.

A logical animation is identified by `(surface, tag, owner, generation)` and
owns a set of platform-neutral targets. Allocate its generation when a
qualifying Fabric mutation is intercepted, before mounting or asynchronous
scheduling. Storing or replacing a configuration creates no generation and
affects only future animations.

Fabric tags are monotonic during a normal renderer lifetime. Thus, the MVP
requires current-generation and mounted-view validation, but no additional
view-incarnation token. Surface teardown invalidates every generation on that
surface.

## State and routing

The accepted diagrams are the compact
[lifecycle state machines](diagrams/03-lifecycle-state-machines.excalidraw) and
the comprehensive
[decision tree](diagrams/03-complete-decision-tree.excalidraw), which follows a
command through routing, ownership, execution, and terminal disposition.

`Fallback` is a routing decision, not a terminal outcome. It keeps the same
logical identity and gives the complete animation to legacy before any native
execution. Legacy then owns progress, callback, and exit cleanup.

| From | Event | To | Required action |
| --- | --- | --- | --- |
| Pending mount | Eligible final state mounted | Scheduled | Keep host state committed; schedule native start. |
| Pending mount | Unsupported but valid plan | Running legacy | Route the whole logical animation to legacy. |
| Pending mount | Malformed plan | Running legacy | Route safely and emit a development diagnostic. |
| Scheduled | Current view and generation found | Running native | Begin all native tracks as one logical animation. |
| Scheduled | View missing or request stale | Rejected | Start nothing; complete once with `false`. |
| Pending or scheduled | Explicit cancellation | Cancelled | Start nothing; apply the cancellation disposition. |
| Running | Natural completion of every track | Finished | Complete once with `true`. |
| Running | Conflicting replacement | Interrupted | Complete the old generation once with `false`; retarget continuously. |
| Running native | Unexpected executor failure | Failed | Stop the generation's remaining tracks and complete once with `false`. |
| Any nonterminal state | Surface teardown | Cancelled | Complete once with `false`, release state, and mount no per-view cleanup. |
| Any terminal state | Late start or completion | Unchanged | Ignore it; never repeat callback or cleanup. |

## Terminal dispositions

| Outcome | Callback | Normal or entering view | Retained exiting view |
| --- | --- | --- | --- |
| Natural completion | `true` once | Presentation equals committed host state. | Request Remove/Delete once. |
| Reduced-motion skip | `true` once | Show committed endpoint immediately. | Request Remove/Delete once. |
| Explicit cancellation | `false` once | Settle immediately to committed host state. | Request Remove/Delete once. |
| Interruption | Old generation `false` once | Replacement starts from current presentation. | Exit priority rules apply. |
| Missing/stale start | `false` once | Remain at committed host state. | Request Remove/Delete once. |
| Executor failure | `false` once | Settle to committed host state. | Request Remove/Delete once. |
| Surface teardown | `false` once | Release state. | Release state; the surface owns destruction. |

Callback observation and cleanup mounting may cross schedulers. Their relative
public order is not guaranteed; exactly-once callback and cleanup are.

## Host, presentation, and interaction

### Layout and entering

- Mount the latest Fabric state before native execution.
- In the same synchronization window, present the legacy initial appearance.
- Animate presentation toward the already-mounted host state.
- A delay holds the initial appearance; the final state must not flash first.
- Cancellation never relies on a later React commit to repair host state.

Hit testing and accessibility use committed final geometry throughout. This is
an intentional difference from legacy's per-frame host updates.

### Exiting

The committed outcome is absence, not an exit style. Keep the last legitimate
host state only to render the exit presentation, make the retained view
noninteractive and unavailable to accessibility, then mount the intercepted
Remove/Delete once. Do not commit the visual exit endpoint as new host state.

Existing view-flattening behavior remains: a removable parent need not wait for
animated children unless it is made non-collapsable. If safe child retention or
identity cannot be guaranteed, use legacy.

## Ownership and interruption

Ownership is exclusive per `(surface, tag, target)`:

- Disjoint targets coexist, even across logical generations.
- A same-target claim uses latest-command-wins.
- Layout owns geometry in the initial shared-owner contract.
- An active exit has priority until deletion; later non-exit claims against the
  logically removed view are rejected.
- Fallback cannot bypass the same coordinator.
- Do not compose targets implicitly.

When only part of an old logical animation is preempted, its public callback
fires once with `false`. Unaffected physical tracks are transferred or
recompiled under the replacement generation without a visual jump.

A replacement starts from the current visible value. Timing animations use
the replacement's easing and implied velocity; they do not inherit the old
timing curve's velocity. Spring support is staged: use legacy until the native
subset proves legacy-compatible state and momentum continuity, then enable that
subset under Objective 13.

## Eligibility and special cases

- Decide eligibility before native execution and route the whole logical
  animation through one clock.
- Never silently omit an unsupported property, value, callback, or transform.
- Once native execution begins, rejection or failure cannot switch to legacy.
- Explicit zero duration completes immediately with `true`; equal endpoints
  receive no special treatment.
- Do not set a semantic maximum finite duration. Resource exhaustion causes
  pre-execution fallback, never truncation.
- Nonterminating animations use legacy. Thus, an exiting one can remain
  retained until legacy cancellation or replacement.
- Nested/per-track callbacks use legacy until callback events are represented
  explicitly. Descriptor construction must never execute them early.
- Unknown, stateful, externally dependent, or side-effecting custom animation
  objects use legacy. Sampling may support only graphs proven deterministic
  from captured inputs and virtual time.
- Partial configuration/template compilation is a possible post-MVP
  optimization; generation allocation and value-dependent plan construction
  still happen at mutation interception.

## Reduced motion

Preserve Reanimated policy exactly:

- `Never` runs the animation.
- `Always` skips it.
- `System` follows the operating-system setting.
- A skip creates no physical animation, ignores delay, settles layout/entering
  at the endpoint, cleans up exiting immediately, and completes with `true`.

## Fidelity tolerances

Lifecycle, callback count/result, ownership, cleanup count, target order, and
final committed identity are exact.

| Observable | Allowed difference |
| --- | --- |
| Final host values versus committed target | `0.01 pt` floating-point epsilon |
| Presentation position or projected transform corners versus legacy | `0.5 pt` |
| Opacity versus legacy | `0.01` |
| Programmed timing checkpoints | One display frame |

Anything larger is unsupported until explicitly approved. Transform operation
order and transform origin are exact semantic requirements for supported
cases.

## Staged support

- Through Objective 09: native timing for opacity and position; size and
  arbitrary transforms use legacy.
- Objective 10: pursue size, ordered transforms, origin, matrices, and the
  component compatibility grid.
- Objective 11: complete entering, exiting, reduced-motion, flattening, and
  public lifecycle semantics.
- Objective 12: add safe sampled-keyframe compatibility without arbitrary
  duration truncation.
- Objective 13: add the proven spring subset, including momentum continuity
  where legacy semantics require it; other springs keep using legacy.

## Required sign-offs

- Layout maintainer: final-state-first interaction difference, disjoint-target
  coexistence versus legacy whole-tag interruption, cancellation differences,
  and fidelity tolerances.
- Accessibility owner: final-geometry hit testing/accessibility, retained exits,
  and reduced motion.
- CSS animation owner: shared ownership terminology and arbitration proposal.
- Android maintainer: state-machine and callback contract contain no
  Apple-specific ordering assumption.

The invariant-to-test mapping is in
[03-invariant-test-matrix.md](03-invariant-test-matrix.md). MVP exclusions are
listed in [03-unsupported-mvp.md](03-unsupported-mvp.md).
