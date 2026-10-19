import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * The drawn values of view properties, read from the view at each draw of the
 * window by the test-host module of the Android runtime-test app
 * (`RuntimeTestsViewSamplerModule.kt`). It reads the view, so it gives the same
 * data for each driver of a property.
 */
interface RuntimeTestsViewSamplerModule extends TurboModule {
  start(tags: number[], properties: string[]): Promise<void>;
  stop(): Promise<number[][]>;
  now(): Promise<number>;
  animatorDurationScale(): Promise<number>;
  apiLevel(): Promise<number>;
}

export type SampledProperty =
  | 'opacity'
  | 'backgroundColor'
  | 'borderColor'
  | 'borderRadius'
  | 'shadowColor';

/**
 * A color is its ARGB int as an unsigned number; no color is NaN. A scalar is
 * rounded to 4 decimals, so a float view property has the decimal of its
 * style.
 */
export type DrawnSample = { timeMs: number; values: number[] };

const LOG_MARKER = 'RuntimeTestsViewSampler';
const DECIMALS = 1e4;

const MODULE_NAME = 'RuntimeTestsViewSampler';

export function isViewSamplerAvailable(): boolean {
  return getSamplerModule() !== null;
}

/**
 * The values of a sample are each property of the first view, then of the next
 * view.
 */
export async function recordDrawnValues(
  tags: number | number[],
  properties: SampledProperty[],
  during: () => Promise<void>
): Promise<DrawnSample[]> {
  const sampler = getEnforcedSamplerModule();
  await sampler.start(Array.isArray(tags) ? tags : [tags], properties);
  try {
    await during();
  } catch (error) {
    await sampler.stop();
    throw error;
  }
  const rows = await sampler.stop();
  return rows.map(([timeMs, ...values]) => ({
    timeMs,
    values: values.map((value) => Math.round(value * DECIMALS) / DECIMALS),
  }));
}

/**
 * One log line for each case, for a comparison of the samples of two builds.
 * `renderStartMs` is the uptime before the render that starts the case.
 */
export function logDrawnValues(
  caseName: string,
  samples: DrawnSample[],
  renderStartMs?: number
) {
  console.log(
    `${LOG_MARKER} ${JSON.stringify({ caseName, samples, renderStartMs })}`
  );
}

/** The uptime in ms: the clock of the samples. */
export function uptimeMs(): Promise<number> {
  return getEnforcedSamplerModule().now();
}

export function animatorDurationScale(): Promise<number> {
  return getEnforcedSamplerModule().animatorDurationScale();
}

export function apiLevel(): Promise<number> {
  return getEnforcedSamplerModule().apiLevel();
}

function getEnforcedSamplerModule(): RuntimeTestsViewSamplerModule {
  const samplerModule = getSamplerModule();
  if (samplerModule === null) {
    throw new Error(`The native module ${MODULE_NAME} is not available.`);
  }
  return samplerModule;
}

function getSamplerModule(): RuntimeTestsViewSamplerModule | null {
  return (
    TurboModuleRegistry.get<RuntimeTestsViewSamplerModule>(MODULE_NAME) ?? null
  );
}
