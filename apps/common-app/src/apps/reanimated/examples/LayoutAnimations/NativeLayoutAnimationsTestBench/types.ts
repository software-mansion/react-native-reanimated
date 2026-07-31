// LayoutAnimationTrace start

export const TEST_BENCH_SCENARIOS = [
  {
    id: 'linear-position',
    title: '1. LinearTransition position only',
    description: 'Moves one view horizontally without changing its size.',
  },
  {
    id: 'position-size-with-text',
    title: '2. Position and size with text',
    description: 'Moves and resizes a view containing wrapping text.',
  },
  {
    id: 'fade-in-out',
    title: '3. FadeIn and FadeOut',
    description: 'Runs a deterministic enter-then-exit cycle.',
  },
  {
    id: 'slide-in-out',
    title: '4. SlideInLeft and SlideOutRight',
    description: 'Runs a directional enter-then-exit cycle.',
  },
  {
    id: 'entering-interrupted-by-layout',
    title: '5. Entering interrupted by layout',
    description:
      'Run + interrupt moves the view 240 ms into its entering animation.',
  },
  {
    id: 'layout-interrupted-by-layout',
    title: '6. Layout interrupted by layout',
    description:
      'Run + interrupt replaces the first layout target after 240 ms.',
  },
  {
    id: 'exit-during-layout',
    title: '7. Exit during layout',
    description:
      'Run + interrupt removes the view 240 ms into its layout animation.',
  },
  {
    id: 'cancel-before-platform-start',
    title: '8. Cancel before platform start',
    description:
      'Use Cancel to remove the entering view after its request and before native platform start.',
  },
  {
    id: 'parent-removal-with-flattening',
    title: '9. Parent removal and flattening',
    description:
      'Removes a flattenable parent containing two exiting children.',
  },
  {
    id: 'reduced-motion',
    title: '10. Reduced motion',
    description:
      'Uses the system reduced-motion setting for the same final layout.',
  },
  {
    id: 'unsupported-style-property',
    title: '11. Unsupported style property',
    description: 'Adds backgroundColor to a custom layout transition.',
  },
  {
    id: 'transform-order-sensitive',
    title: '12. Transform-order-sensitive',
    description: 'Enters with rotate before translateX in the transform array.',
  },
  {
    id: 'final-state-layout-model',
    title: '13. Final model during layout',
    description:
      'Moves and resizes a view whose text, border, and background must mount at the final geometry before pixels interpolate.',
    group: 'final-state-first',
  },
  {
    id: 'delayed-entering-final-state',
    title: '14. Delayed entering',
    description:
      'Mounts final Fabric state, waits one second without a final-state flash, then fades in.',
    group: 'final-state-first',
  },
  {
    id: 'back-to-back-final-commits',
    title: '15. Back-to-back final commits',
    description:
      'Run + interrupt sends a second final layout while the first presentation is active.',
    group: 'final-state-first',
  },
  {
    id: 'retained-exit-cleanup',
    title: '16. Retained exit cleanup',
    description:
      'Keeps the mounted view during exit, then removes it after one terminal callback.',
    group: 'final-state-first',
  },
  {
    id: 'timing-linear-opacity-position',
    title: '17. Linear opacity + position',
    description:
      'Runs simultaneous opacity and position timing tracks through direct Core Animation primitives.',
    group: 'timing-mvp',
  },
  {
    id: 'timing-nonuniform-segments',
    title: '18. Nonuniform timing segments',
    description:
      'Moves through a declared 25% segment boundary before the longer second segment.',
    group: 'timing-mvp',
  },
  {
    id: 'timing-delayed-opacity',
    title: '19. Delayed linear opacity',
    description:
      'Holds the initial visual state for 750 ms, then runs direct linear timing.',
    group: 'timing-mvp',
  },
  {
    id: 'geometry-component-grid',
    title: '20. Geometry component grid',
    description:
      'Runs the same final-state-first position and size change across View, Text, Image, ScrollView, border, shadow, clipping, and nested content.',
    group: 'geometry',
  },
  {
    id: 'entering-then-layout',
    title: '21. Entering → layout',
    description:
      'Starts a layout transition while the entering generation is active.',
    group: 'public-semantics',
  },
  {
    id: 'entering-removed-before-start',
    title: '22. Entering removed before start',
    description:
      'Removes an entering view while native platform start is gated.',
    group: 'public-semantics',
  },
  {
    id: 'layout-then-exit',
    title: '23. Layout → exit at 40%',
    description:
      'Starts an opacity exit from the current presentation during geometry motion.',
    group: 'public-semantics',
  },
  {
    id: 'forced-exit-cleanup',
    title: '24. Forced exit cleanup',
    description:
      'Cancels a retained exit and verifies one false callback with no zombie view.',
    group: 'public-semantics',
  },
  {
    id: 'nested-parent-child-exit',
    title: '25. Nested parent/child exit',
    description: 'Removes a parent whose child owns a separate exit animation.',
    group: 'public-semantics',
  },
  {
    id: 'reparent-during-layout',
    title: '26. Reparent during layout',
    description:
      'Moves one keyed animated host between parents while layout motion is active.',
    group: 'public-semantics',
  },
  {
    id: 'modal-surface-removal',
    title: '27. Modal surface removal',
    description:
      'Runs an exit inside a modal surface and then removes the modal.',
    group: 'public-semantics',
  },
  {
    id: 'resolved-random-delay',
    title: '28. Resolved random delay',
    description:
      'Resolves one random delay in the builder and carries that fixed value in the plan.',
    group: 'public-semantics',
  },
  {
    id: 'negative-delay',
    title: '29. Negative delay',
    description: 'Starts native playback 25% into its declared timing curve.',
    group: 'public-semantics',
  },
] as const;

export type TestBenchScenarioId = (typeof TEST_BENCH_SCENARIOS)[number]['id'];
export type TestBenchPhase =
  | 'reset'
  | 'run'
  | 'run-end'
  | 'interrupt'
  | 'cancel';
export type TestBenchMode = 'run' | 'interrupt' | 'cancel';

export const DEFAULT_DURATION_MS = 900;
export const DEFAULT_REPETITIONS = 1;
export const INTERRUPT_AT_MS = 240;
export const RESET_SETTLE_MS = 100;

export function scenarioInterruptAtMs(
  scenario: TestBenchScenarioId,
  durationMs: number
): number {
  return scenario === 'layout-interrupted-by-layout'
    ? Math.round(durationMs * 0.4)
    : INTERRUPT_AT_MS;
}

export function scenarioHasRunEnd(scenario: TestBenchScenarioId): boolean {
  return (
    scenario === 'fade-in-out' ||
    scenario === 'slide-in-out' ||
    scenario === 'retained-exit-cleanup' ||
    scenario === 'modal-surface-removal' ||
    scenario === 'nested-parent-child-exit'
  );
}

export function scenarioStartDelayMs(scenario: TestBenchScenarioId): number {
  if (scenario === 'delayed-entering-final-state') {
    return 1000;
  }
  if (scenario === 'resolved-random-delay') {
    return 1000;
  }
  return scenario === 'timing-delayed-opacity' ? 750 : 0;
}

export function scenarioCancelsBeforePlatformStart(
  scenario: TestBenchScenarioId
): boolean {
  return (
    scenario === 'cancel-before-platform-start' ||
    scenario === 'entering-removed-before-start'
  );
}

// LayoutAnimationTrace end
