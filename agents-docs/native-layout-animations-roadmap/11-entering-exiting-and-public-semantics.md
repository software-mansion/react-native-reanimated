# Objective 11 — Complete Entering, Exiting, and Public Semantics

## Goal

Make the supported native path honor the public layout-animation contract:
entering/exiting lifecycle, callbacks, reduced motion, delays, view flattening,
and cleanup.

## Depends on

- Objective 09 terminal-event lifecycle.
- Objective 10 geometry/transform policy.

## Concurrency

**Sequential for lifecycle integration.** Scenario authoring may overlap late
Objective 10. Objective 12's pure curve-simplifier prototype, Objective 13's
numerical spring comparison, and Objective 14's Android spike may proceed in
parallel, but none should integrate until this objective freezes callback,
reduced-motion, entering, and exiting outcomes.

## Entering contract

### Required behavior

- The view is mounted with final Fabric props and layout.
- Its first visible presentation matches `initialValues`.
- Delay holds the initial presentation without flashing final state.
- Natural completion exposes the final model and calls callback `true`.
- Interruption/cancellation calls callback `false` exactly once.

### Recommended flow

```text
Insert final view
  -> pending entering plan associated with mount transaction
  -> post-mount resolve layer
  -> model is final
  -> explicit animation values begin at initialValues
  -> backwards fill covers delay
  -> self-remove at completion
```

Investigate whether `didMount` executes early enough to install CA animation
before the first display commit. If not, introduce a narrow pre-display hook or
initial hiding mechanism that is restored through real mounted props, not a
permanent direct layer write.

## Exiting contract

### Required behavior

- Remove/Delete are deferred while the exit animation owns the view.
- Exit starts from current presentation if another layout animation was active.
- Natural completion requests cleanup immediately on the correct surface.
- Parent/child exit rules and flattening behavior remain equivalent to legacy.
- Screen/pop forced cleanup cannot retain zombie views.
- An opacity-only exit may overlap an in-flight geometry animation. Geometry
  remains visually continuous during the fade; when exit cleanup deletes the
  view, any remaining geometry handle completes once with `finished=false`.

### Recommended flow

```text
Remove/Delete intercepted
  -> node state ANIMATING
  -> start exit generation
  -> terminal event
  -> node state DEAD
  -> surface cleanup requested
  -> removal transaction mounted
```

## User callback registry

Store callback with owner lifecycle state on the UI runtime:

```ts
callbacks.set(handleKey, style.callback);
```

Platform completion returns only serializable/native data:

```text
handle + finished + terminal reason
```

Then schedule callback execution on the UI runtime. Main-thread Objective-C++
must never retain or call a JSI function.

## Reduced motion

Decide eligibility after you apply the current reduced-motion policy.

Possible outcomes:

- immediate final state with callback `true`;
- a reduced replacement animation;
- legacy fallback when native plan cannot express the policy.

Do not route “skipped” reduced-motion behavior through a fake 1/60-second CA
animation merely to obtain completion.

## Delays and random delay

- Resolve `randomDelay` once in the layout builder, exactly as legacy does.
- Carry the resolved result in the plan; do not randomize again in native code.
- Negative-delay behavior must begin at the corresponding progressed state.
- During positive delay, entering presentation remains at initial values.

## View flattening and nativeID

Preserve established New Architecture rules:

- entering configuration transferred through `nativeID` must still attach to
  the correct mounted tag;
- overwriting nativeID remains a known public constraint;
- exiting animated children and collapsable parents follow existing retention
  rules;
- stale generations cannot attach after a flattened/moved node changes tag or
  parent relation.

## Mixed lifecycle cases

Define and test:

1. Entering immediately followed by layout.
2. Entering view removed before native start.
3. Layout immediately followed by exit.
4. Exit interrupted by forced screen cleanup.
5. Parent exiting while child has its own exit.
6. Reparent/move while layout animation is active.
7. Multiple surfaces and modal removal.

## Alternatives for callback completion

### CA delegate calls owner completion

Recommended with executor aggregation and thread hop.

### CATransaction completion block

Can help group scheduling, but does not replace logical handle tracking when
animations are independently replaced or removed.

### Timer matching duration

Not recommended; cancellation, layer-local clocks, app suspension, and native
animation replacement make it unreliable.

## Acceptance criteria

- Public callbacks match legacy `finished` semantics.
- Reduced motion does not create unnecessary native motion.
- Entering delay has no flash.
- Exiting cleanup does not wait for unrelated React work.
- Flattening, moved views, screen cleanup, and multiple surfaces pass the
  required scenarios.
- Post-Objective-02 lifecycle traces captured with the Objective 01 harness
  match for the supported subset.

## How to test at this stage

Use [TESTING-GUIDE.md](TESTING-GUIDE.md), including its reduced-motion steps.
Add one deterministic test-bench scenario for each of the seven mixed lifecycle
cases above.

1. **Entering:** run FadeIn and SlideInLeft with no delay and with a 1000 ms
   delay. Record first visible presentation, model state, terminal event, and
   callback. Assert no final-state flash and exactly one `true` callback on
   natural completion.
2. **Exiting:** run FadeOut and SlideOutRight, including layout→exit at 40%.
   Assert exit begins from current presentation, Remove/Delete stays deferred,
   and cleanup mounts immediately after one terminal event on the right
   surface.
3. **Interruption:** remove an entering view before native start and force-clean
   an exiting screen at 40%. Each cancelled generation must call its callback
   once with `false`; no retained view, registry entry, or CA key may remain.
4. Toggle **Settings > Accessibility > Motion > Reduce Motion** off and on, as
   described in the testing guide. Run **[LA] Reduced Motion** and the test-bench
   entering/layout/exiting cases. Assert the accepted policy, no unnecessary CA
   key for a skipped animation, the same committed final state, and correct
   callback semantics.
5. Run **[LA] View Flattening**, parent-with-animated-child exit, **[LA]
   Reparenting**, a modal/multiple-surface removal, and **[LA] Exiting tag reuse
   stress**. Repeat the stress scenario 100 times with AddressSanitizer.
6. Test fixed positive delay, resolved random delay recorded in the plan, and
   negative delay. Assert native code does not randomize again and presentation
   starts at the expected progressed value for a negative delay.
7. Run every case on legacy and native three times and compare event ordering,
   `finished`, callback count, cleanup, and final state. Attach traces for all
   mixed cases and video for delayed entering and nested exiting.
8. Run common tests, Apple lint, and common-app type checking.

You must use the simulator for the semantic gate. This test is enough for the
gate. Before you declare the iOS MVP user-ready, run reduced motion and one
screen/modal cleanup case on a physical iPhone.

## References

- [JS layout lifecycle and callbacks](../../packages/react-native-reanimated/src/layoutReanimation/animationsManager.ts)
- [Base animation builder options](../../packages/react-native-reanimated/src/layoutReanimation/animationBuilder/BaseAnimationBuilder.ts)
- [Legacy exiting tree lifecycle](../../packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.cpp)
- [Layout animation best-practice notes](../reanimated-native-animations/sol-review.md)

## Next objective

[Objective 12 — Add Sampled-Keyframe Fallback](12-sampled-keyframe-fallback.md).
