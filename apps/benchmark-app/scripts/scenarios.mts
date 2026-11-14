export type Scenario = (typeof SCENARIOS)[number];

export interface ScenarioRequirements {
  updateShare: number;
  minimumMountBatches: number;
}

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

const FULL_WORK: ScenarioRequirements = {
  updateShare: 1,
  minimumMountBatches: 0,
};

export const SCENARIO_REQUIREMENTS: Record<Scenario, ScenarioRequirements> = {
  'worklet-styles-transform': FULL_WORK,
  'worklet-styles-layout': FULL_WORK,
  css: FULL_WORK,
  'layout-animations': FULL_WORK,
  'sticky-header': FULL_WORK,
  'shared-elements': { updateShare: 1, minimumMountBatches: 300 },
  'mount-unmount': FULL_WORK,
  'idle-cost': { updateShare: 0.5, minimumMountBatches: 0 },
};

export function isScenario(name: unknown): name is Scenario {
  return SCENARIOS.includes(name as Scenario);
}
