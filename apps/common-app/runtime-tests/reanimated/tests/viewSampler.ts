import type { TurboModule } from 'react-native';
import { Platform, TurboModuleRegistry } from 'react-native';
import { runOnUISync, scheduleOnUI } from 'react-native-worklets';

const UI_FRAME_CLOCK_ROWS = '__runtimeTestsFrameClockRows';
const FRAME_CLOCK_ROWS = 1800;

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
  collectGarbage(): Promise<void>;
  postsAnimatorEnd(): Promise<boolean | null>;
  failNextViewLookup(tag: number): Promise<void>;
  takeViewLookupFailure(): Promise<number[] | null>;
  startFrameClock(): void;
  frameClockRows(): number[][];
}

export type SampledProperty =
  | 'opacity'
  | 'backgroundColor'
  | 'borderColor'
  | 'borderRadius'
  | 'shadowColor';

/**
 * A property of one value, a geometry read of `GEOMETRY_VALUE_COUNTS`, or
 * `animationTime`: the animation clock of the frame of the draw
 * (`ClockFrame`).
 */
export type RecordedProperty =
  | SampledProperty
  | GeometryProperty
  | 'animationTime';

/**
 * Each in dp, with this number of values: `frame` (left, top, width, height in
 * the parent), `translation` (x, y), `animationMatrix` (the six cells of
 * `SAMPLE_MATRIX_CELLS`, NaN with no animation matrix), `drawnMatrix` (the six
 * cells of `animationMatrix ∘ matrix`: the map of a point of the view to its
 * place from the frame origin), `hitRect` and `accessibilityBounds` (left, top,
 * right, bottom; the accessibility bounds on the screen).
 */
export const GEOMETRY_VALUE_COUNTS = {
  frame: 4,
  translation: 2,
  animationMatrix: 6,
  drawnMatrix: 6,
  hitRect: 4,
  accessibilityBounds: 4,
} as const;

export type GeometryProperty = keyof typeof GEOMETRY_VALUE_COUNTS;

/** The number of values that a property has in a sample. */
export const valueCountOf = (property: RecordedProperty): number =>
  property in GEOMETRY_VALUE_COUNTS
    ? GEOMETRY_VALUE_COUNTS[property as GeometryProperty]
    : 1;

/**
 * The drawn place of a point of the view (in dp, from the top left corner of
 * the view) in its parent, from the `frame` and `drawnMatrix` values of one
 * sample.
 */
export function drawnPointOf(
  [left, top]: readonly number[],
  [scaleX, skewY, skewX, scaleY, translateX, translateY]: readonly number[],
  [x, y]: readonly [number, number]
): [number, number] {
  return [
    left + scaleX * x + skewX * y + translateX,
    top + skewY * x + scaleY * y + translateY,
  ];
}

/**
 * A color is its ARGB int as an unsigned number; no color is NaN. A scalar is
 * rounded to 4 decimals, so a float view property has the decimal of its
 * style.
 */
export type DrawnSample = { timeMs: number; values: number[] };

/** `timeMs` of a draw is a whole millisecond of `SystemClock.uptimeMillis()`. */
export const DRAW_TIME_STEP_MS = 1;

const LOG_MARKER = 'RuntimeTestsViewSampler';
const DECIMALS = 1e4;

const MODULE_NAME = 'RuntimeTestsViewSampler';

/**
 * A frame of the UI thread, each time in ms of the monotonic clock of the
 * samples: the frame time that a frame callback gets, the animation clock of
 * the animators, and the run of the frame callback of the sampler. The two
 * clocks differ in the buffer stuffing recovery of Android 16. iOS: the frame
 * time is the time of the display refresh of the frame, and the animation clock
 * is the frame time.
 */
export type ClockFrame = {
  frameTimeMs: number;
  animationTimeMs: number;
  ranMs: number;
};

/**
 * Starts the frame clock: of the sampler on Android, of the frames of the UI
 * runtime on iOS. It runs until the app ends.
 */
export function startFrameClock() {
  if (Platform.OS === 'ios') {
    scheduleOnUI(startUIFrameClock);
    return;
  }
  getEnforcedSamplerModule().startFrameClock();
}

/** The frames of the frame clock, the oldest first. */
export function readFrameClock(): ClockFrame[] {
  if (Platform.OS === 'ios') {
    return runOnUISync(uiFrameClockRows);
  }
  return getEnforcedSamplerModule()
    .frameClockRows()
    .map(([frameTimeMs, animationTimeMs, ranMs]) => ({
      frameTimeMs,
      animationTimeMs,
      ranMs,
    }));
}

/**
 * A frame of the UI runtime on iOS gets the time of its display refresh on the
 * animation clock. The row puts it on the sample clock from the run of the
 * frame.
 */
function startUIFrameClock() {
  'worklet';
  const rows: ClockFrame[] = [];
  (globalThis as Record<string, unknown>)[UI_FRAME_CLOCK_ROWS] = rows;
  const onFrame = (timestampMs: number) => {
    const ranMs = performance.now();
    const frameTimeMs = ranMs + timestampMs - global._getAnimationTimestamp();
    rows.push({ frameTimeMs, animationTimeMs: frameTimeMs, ranMs });
    if (rows.length > FRAME_CLOCK_ROWS) {
      rows.shift();
    }
    requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);
}

function uiFrameClockRows(): ClockFrame[] {
  'worklet';
  return [
    ...((globalThis as Record<string, unknown>)[
      UI_FRAME_CLOCK_ROWS
    ] as ClockFrame[]),
  ];
}

export function isViewSamplerAvailable(): boolean {
  return getSamplerModule() !== null;
}

/**
 * The values of a sample are each property of the first view, then of the next
 * view.
 */
export async function recordDrawnValues(
  tags: number | number[],
  properties: RecordedProperty[],
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
 * The frame time of a frame callback of the UI runtime and the animation
 * timestamp at its run, each in ms.
 */
export type FrameCallbackRun = [frameTimeMs: number, ranMs: number];

/** A declared start value of one value of a sample. */
export type StartValue = {
  property: RecordedProperty;
  value: number;
  tolerance: number;
  isColor: boolean;
};

export type DrawnValuesDetails = {
  /** The uptime before the render that starts the case. */
  renderStartMs?: number;
  /** One for each value of a sample, in the order of the values. */
  startValues?: StartValue[];
  /** The declared delay of the case. */
  delayMs?: number;
  frameCallbacks?: FrameCallbackRun[];
};

/** One log line for each case, for a comparison of the samples of two builds. */
export function logDrawnValues(
  caseName: string,
  samples: DrawnSample[],
  details: DrawnValuesDetails = {}
) {
  console.log(
    `${LOG_MARKER} ${JSON.stringify({ caseName, samples, ...details })}`
  );
}

/** The uptime in ms: the clock of the samples. */
export function uptimeMs(): Promise<number> {
  return getEnforcedSamplerModule().now();
}

/**
 * A garbage collection: the next read of a weak map has no entry of a freed
 * view.
 */
export function collectGarbage(): Promise<void> {
  return getEnforcedSamplerModule().collectGarbage();
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
