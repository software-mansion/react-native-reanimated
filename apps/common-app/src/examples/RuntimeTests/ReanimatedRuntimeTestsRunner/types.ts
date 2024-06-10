import { Component, Dispatch, MutableRefObject, ReactNode, SetStateAction } from 'react';
import { AnimatedStyle, StyleProps } from 'react-native-reanimated';

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
  ONLY = 'ONLY',
  SKIP = 'SKIP',
  NONE = 'NONE',
}

export enum TestDecorator {
  ONLY = 'ONLY',
  SKIP = 'SKIP',
  FAILING = 'FAILING',
  WARN = 'WARN',
  NONE = 'NONE',
}

export type TestCase = {
  name: string;
  run: () => void | Promise<void>;
  componentsRefs: Record<string, ComponentRef>;
  callsRegistry: Record<string, CallTracker>;
  errors: string[];
  skip?: boolean;
} & (
  | {
      decorator: TestDecorator.WARN | TestDecorator.FAILING;
      warningMessage: string;
    }
  | { decorator: Exclude<TestDecorator, TestDecorator.WARN | TestDecorator.FAILING> | null }
);

export type TestSuite = {
  name: string;
  buildSuite: () => void;
  testCases: TestCase[];
  nestingLevel: number;
  beforeAll?: () => void | Promise<void>;
  afterAll?: () => void | Promise<void>;
  beforeEach?: () => void | Promise<void>;
  afterEach?: () => void | Promise<void>;
  skip?: boolean;
  decorator?: DescribeDecorator | null;
};

export type ValidPropNames = 'zIndex' | 'opacity' | 'width' | 'height' | 'top' | 'left' | 'backgroundColor';

export enum ComparisonMode {
  STRING = 'STRING',
  DISTANCE = 'DISTANCE',
  NUMBER = 'NUMBER',
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
  | null
  | undefined;
export type NullableTestValue = TestValue | null | undefined;

export type TestConfiguration = {
  render: Dispatch<SetStateAction<ReactNode | null>>;
};

declare global {
  var mockedAnimationTimestamp: number | undefined;
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
}

export type TestSummary = {
  passed: number;
  failed: number;
  skipped: number;
  failedTests: Array<string>;
  startTime: number;
  endTime: number;
};
