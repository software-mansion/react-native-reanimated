import type {
  Component,
  Dispatch,
  ReactNode,
  RefObject,
  SetStateAction,
} from 'react';
import type {
  AnimatedStyle,
  LayoutAnimationStartFunction,
  StyleProps,
} from 'react-native-reanimated';

export type CallTracker = {
  UICallsCount: number;
  JSCallsCount: number;
};

type ShadowNodeWrapper = {
  __hostObjectShadowNodeWrapper: never;
};

export type TrackerCallCount = {
  name: string;
  onJS: number;
  onUI: number;
};

export type SharedValueSnapshot<TValue extends TestValue> = {
  name: string;
  onJS: TValue;
  onUI: TValue;
};

export type ComponentRef = RefObject<
  (Component & { props: { style: Record<string, unknown> } }) | null
>;

export enum DescribeDecorator {
  ONLY = 'only',
  SKIP = 'skip',
}

export enum TestDecorator {
  ONLY = 'only',
  SKIP = 'skip',
}

export type TestCase = {
  name: string;
  run: MaybeAsync<void>;
  componentsRefs: Record<string, ComponentRef>;
  callsRegistry: Record<string, CallTracker>;
  errors: string[];
  skip?: boolean;
  decorator?: TestDecorator | null;
};

export type MaybeAsync<T> = () => T | Promise<T>;

export type TestSuite = {
  name: string;
  buildSuite: MaybeAsync<void>;
  testCases: TestCase[];
  nestingLevel: number;
  beforeAll?: MaybeAsync<void>;
  afterAll?: MaybeAsync<void>;
  beforeEach?: MaybeAsync<void>;
  afterEach?: MaybeAsync<void>;
  skip?: boolean;
  decorator?: DescribeDecorator | null;
};

export type ValidPropNames =
  | 'zIndex'
  | 'opacity'
  | 'width'
  | 'height'
  | 'top'
  | 'left'
  | 'backgroundColor'
  | 'boxShadow';

export function isValidPropName(propName: string): propName is ValidPropNames {
  'worklet';
  return [
    'zIndex',
    'opacity',
    'width',
    'height',
    'top',
    'left',
    'backgroundColor',
    'boxShadow',
  ].includes(propName);
}

export enum ComparisonMode {
  STRING = 'STRING',
  PIXEL = 'PIXEL',
  FLOAT_DISTANCE = 'FLOAT_DISTANCE',
  NUMBER = 'NUMBER',
  FLOAT = 'FLOAT',
  COLOR = 'COLOR',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
  AUTO = 'AUTO',
}

export type LockObject = { lock: boolean };

type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type OperationUpdate = Writable<
  | StyleProps
  | AnimatedStyle<Writable<Record<string, unknown>>>
  | Writable<Record<string, unknown>>
>;

export interface Operation {
  tag?: number;
  shadowNodeWrapper?: ShadowNodeWrapper;
  name: string;
  updates: OperationUpdate;
}

export type TestValue =
  | TrackerCallCount
  | string
  | Array<unknown>
  | number
  | bigint
  | Record<string, unknown>
  | boolean
  | null
  | undefined
  | OperationUpdate
  | (() => unknown);

export type TestConfiguration = {
  render: Dispatch<SetStateAction<ReactNode | null>>;
};

export type Mismatch = {
  index: number;
  expectedSnapshot: OperationUpdate;
  capturedSnapshot: OperationUpdate;
};

export type DefaultValue = 'not_ok' | 'ok';
export type ValueWrapper<T> = { value: T | DefaultValue };

/**
 * A single native update recorded by the `NativeMutationsRegistry` (C++) - the
 * value that was actually sent to the platform mounting layer. Either a
 * `snapshot` of the view's props (from a `ShadowViewMutation`) or a Core
 * Animation `descriptor` (for props routed straight to the `CALayer`).
 */
export type RecordedNativeMutation = {
  tag: number;
  index: number;
  snapshot?: Record<string, string>;
  descriptor?: {
    property: string;
    from: number;
    to: number;
    duration: number;
  };
};

declare global {
  var mockedAnimationTimestamp: number | undefined;
  var framesCount: number | undefined;
  var originalRequestAnimationFrame:
    | ((callback: (timestamp: number) => void) => void)
    | undefined;
  var originalGetAnimationTimestamp: (() => number) | undefined;
  var originalUpdateProps: ((operations: Operation[]) => void) | undefined;
  var originalNotifyAboutProgress:
    | ((tag: number, value: Record<string, unknown>) => void)
    | undefined;
  var originalFlushAnimationFrame:
    | ((frameTimestamp: number) => void)
    | undefined;
  var _getAnimationTimestamp: () => number;
  var __frameTimestamp: number | undefined;
  var _registriesLeakCheck: () => string;
  var _updateProps: (operations: Operation[]) => void;
  var _notifyAboutProgress: (
    tag: number,
    value: Record<string, unknown>
  ) => void;
  var _obtainProp: (shadowNodeWrapper: unknown, propName: string) => string;
  // ReJest native-mutation recording (installed only when the
  // `RUNTIME_TEST_FLAG` static feature flag is enabled). See
  // `NativeMutationsRegistry` on the native side.
  var _startRecordingNativeMutations: (() => void) | undefined;
  var _stopRecordingNativeMutations: (() => void) | undefined;
  var _clearRecordedNativeMutations: (() => void) | undefined;
  var _getRecordedNativeMutations: (() => RecordedNativeMutation[]) | undefined;
  // Reads the latest value of `propName` actually sent to the platform for the
  // given view. Mirrors `_obtainProp` but reflects the recorded mutation stream.
  var _obtainLatestRecordedProp:
    | ((shadowNodeWrapper: unknown, propName: string) => string)
    | undefined;
  var __flushAnimationFrame: (frameTimestamp: number) => void;
  var LayoutAnimationsManager: {
    start: LayoutAnimationStartFunction;
    stop: (tag: number) => void;
  };
  var originalLayoutAnimationsManager: {
    start: LayoutAnimationStartFunction;
    stop: (tag: number) => void;
  };
}
