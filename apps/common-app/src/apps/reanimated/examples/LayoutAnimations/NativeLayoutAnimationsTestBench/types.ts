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
      'Use Interrupt to move the view 240 ms into its entering animation.',
  },
  {
    id: 'layout-interrupted-by-layout',
    title: '6. Layout interrupted by layout',
    description:
      'Use Interrupt to replace the first layout target after 240 ms.',
  },
  {
    id: 'exit-during-layout',
    title: '7. Exit during layout',
    description:
      'Use Interrupt to remove a view while its layout animation is active.',
  },
  {
    id: 'cancel-before-platform-start',
    title: '8. Cancel before platform start',
    description: 'Use Cancel to remove the entering view on the next JS task.',
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

export function scenarioHasRunEnd(scenario: TestBenchScenarioId): boolean {
  return scenario === 'fade-in-out' || scenario === 'slide-in-out';
}

// LayoutAnimationTrace end
