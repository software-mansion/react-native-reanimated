import path from 'node:path';

import { SCENARIOS, SCENARIO_REQUIREMENTS } from './scenarios.mts';
import type { Scenario } from './scenarios.mts';

export interface CiSide {
  reanimated: string;
  worklets: string;
}

export interface CiInputs {
  platform: string;
  a: CiSide;
  b: CiSide;
  scenarios: string;
  sharedElementTransitions: boolean;
  checkoutSha: string;
  tarballsDir: string;
}

export interface CiConfig {
  name: string;
  a: CiVariant;
  b: CiVariant;
  scenarios: string[];
  note: string;
}

interface CiVariant extends CiSide {
  reanimatedFlags?: Record<string, boolean>;
}

const CHECKOUT = 'checkout';

const REANIMATED_TARBALL = 'react-native-reanimated.tgz';

const WORKLETS_TARBALL = 'react-native-worklets.tgz';

const ALL_SCENARIOS = 'all';

const SHARED_ELEMENT_TRANSITIONS_FLAG = 'ENABLE_SHARED_ELEMENT_TRANSITIONS';

export function ciConfig(
  inputs: CiInputs,
  compatibleWorklets: (reanimated: string) => string
): CiConfig {
  const enabledFlags = inputs.sharedElementTransitions
    ? [SHARED_ELEMENT_TRANSITIONS_FLAG]
    : [];
  const variantOf = (side: CiSide): CiVariant => ({
    ...sourcesOf(side, inputs.tarballsDir, compatibleWorklets),
    ...(enabledFlags.length > 0
      ? {
          reanimatedFlags: Object.fromEntries(
            enabledFlags.map((flag) => [flag, true])
          ),
        }
      : {}),
  });
  return {
    name: [
      inputs.platform,
      label(inputs.a.reanimated),
      'vs',
      label(inputs.b.reanimated),
    ].join('-'),
    a: variantOf(inputs.a),
    b: variantOf(inputs.b),
    scenarios: scenariosOf(inputs.scenarios, enabledFlags),
    note: `A: Reanimated ${inputs.a.reanimated}. B: Reanimated ${inputs.b.reanimated}. ${CHECKOUT} is the commit ${inputs.checkoutSha} that the workflow checked out.`,
  };
}

function sourcesOf(
  side: CiSide,
  tarballsDir: string,
  compatibleWorklets: (reanimated: string) => string
): CiSide {
  const workletsTarball = path.join(tarballsDir, WORKLETS_TARBALL);
  if (side.reanimated === CHECKOUT) {
    return {
      reanimated: path.join(tarballsDir, REANIMATED_TARBALL),
      worklets:
        side.worklets === '' || side.worklets === CHECKOUT
          ? workletsTarball
          : side.worklets,
    };
  }
  return {
    reanimated: side.reanimated,
    worklets:
      side.worklets === CHECKOUT
        ? workletsTarball
        : side.worklets || compatibleWorklets(side.reanimated),
  };
}

function label(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '-');
}

function scenariosOf(value: string, enabledFlags: readonly string[]): string[] {
  if (value.trim() === ALL_SCENARIOS) {
    return SCENARIOS.filter((scenario) => hasFlags(scenario, enabledFlags));
  }
  return value
    .split(',')
    .map((scenario) => scenario.trim())
    .filter(Boolean);
}

function hasFlags(scenario: Scenario, enabledFlags: readonly string[]) {
  return SCENARIO_REQUIREMENTS[scenario].reanimatedFlags.every((flag) =>
    enabledFlags.includes(flag)
  );
}
