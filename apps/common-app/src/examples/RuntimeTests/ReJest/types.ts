import type { Component, Dispatch, MutableRefObject, ReactNode, SetStateAction } from 'react';
import type { AnimatedStyle, LayoutAnimationStartFunction, StyleProps } from 'react-native-reanimated';

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

export type SharedValueSnapshot = {
  name: string;
  onJS: TestValue;
  onUI: TestValue;
};

export type ComponentRef = MutableRefObject<(Component & { props: { style: Record<string, unknown> } }) | null>;

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
  return ['zIndex', 'opacity', 'width', 'height', 'top', 'left', 'backgroundColor', 'boxShadow'].includes(propName);
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

export type OperationUpdate = StyleProps | AnimatedStyle<Record<string, unknown>> | Record<string, unknown>;

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

/* eslint-disable no-var */
declare global {
  var mockedAnimationTimestamp: number | undefined;
  var framesCount: number | undefined;
  var originalRequestAnimationFrame: ((callback: (timestamp: number) => void) => void) | undefined;
  var originalGetAnimationTimestamp: (() => number) | undefined;
  var originalUpdateProps: ((operations: Operation[]) => void) | undefined;
  var originalNotifyAboutProgress:
    | ((tag: number, value: Record<string, unknown>, isSharedTransition: boolean) => void)
    | undefined;
  var originalFlushAnimationFrame: ((frameTimestamp: number) => void) | undefined;
  var _getAnimationTimestamp: () => number;
  var __frameTimestamp: number | undefined;
  var _IS_FABRIC: boolean | undefined;
  var _updatePropsPaper: (operations: Operation[]) => void;
  var _updatePropsFabric: (operations: Operation[]) => void;
  var _notifyAboutProgress: (tag: number, value: Record<string, unknown>, isSharedTransition: boolean) => void;
  var _obtainPropPaper: (viewTag: number, propName: string) => string;
  var _obtainPropFabric: (shadowNodeWrapper: unknown, propName: string) => string;
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
/* eslint-enable no-var */
