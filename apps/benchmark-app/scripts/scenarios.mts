export const SCENARIOS = [
  'worklet-styles-transform',
  'worklet-styles-layout',
  'css',
  'layout-animations',
  'sticky-header',
  'shared-elements',
  'mount-unmount',
  'idle-cost',
] as const;

export type Scenario = (typeof SCENARIOS)[number];

export const MEMORY_GROWTH_SCENARIOS: readonly Scenario[] = [
  'shared-elements',
  'mount-unmount',
];

export function isScenario(name: unknown): name is Scenario {
  return SCENARIOS.includes(name as Scenario);
}
