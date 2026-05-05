'use strict';

import { getStaticFeatureFlag } from '../featureFlags/featureFlags';

let captureStackEnabled: boolean | undefined;

/**
 * Captures the current JS stack to attach to a worklet scheduled on a worklet
 * runtime, so a fatal error inside the worklet can be reported with a trace
 * back to the call site.
 *
 * Returns `undefined` outside of `__DEV__` and when the
 * `DISABLE_ACCURATE_ERROR_STACKS` static feature flag is enabled. Capturing a
 * stack via `new Error().stack` is expensive, so this is the user-facing
 * opt-out for cases where scheduling throughput matters more than error
 * trace fidelity.
 */
export function getScheduleStack(): string | undefined {
  if (!__DEV__) {
    return undefined;
  }
  if (captureStackEnabled === undefined) {
    captureStackEnabled = !getStaticFeatureFlag('DISABLE_ACCURATE_ERROR_STACKS');
  }
  if (!captureStackEnabled) {
    return undefined;
  }
  return new Error().stack ?? '';
}
