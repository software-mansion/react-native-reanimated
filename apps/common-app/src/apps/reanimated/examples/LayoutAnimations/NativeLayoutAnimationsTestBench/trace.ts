// LayoutAnimationTrace start

import { AccessibilityInfo, Platform } from 'react-native';
import { getStaticFeatureFlag } from 'react-native-reanimated';

import type { TestBenchScenarioId } from './types';

type HarnessTraceEvent =
  | 'scenario-reset'
  | 'scenario-run'
  | 'scenario-interrupt'
  | 'scenario-cancel'
  | 'callback-invoked'
  | 'animation-settled';

interface LayoutAnimationTraceProxy {
  _startLayoutAnimationTrace?(options: {
    runId: number;
    backend: 'legacy' | 'native';
    scenario: TestBenchScenarioId;
    environment: {
      platform: 'ios' | 'android';
      osVersion: string;
      reducedMotion: boolean;
    };
  }): void;
  _stopLayoutAnimationTrace?(): void;
  _getLayoutAnimationTrace?(): string;
  _recordLayoutAnimationTraceEvent?(
    event: HarnessTraceEvent,
    finished: boolean | null,
    callbackCount: number | null
  ): void;
}

function getTraceProxy(): LayoutAnimationTraceProxy | undefined {
  return (
    globalThis as typeof globalThis & {
      __reanimatedModuleProxy?: LayoutAnimationTraceProxy;
    }
  ).__reanimatedModuleProxy;
}

export function getCompiledLayoutAnimationBackend(): 'legacy' | 'native' {
  return getStaticFeatureFlag('IOS_USE_NATIVE_LAYOUT_ANIMATIONS')
    ? 'native'
    : 'legacy';
}

export async function getReducedMotionEnabled(): Promise<boolean> {
  return AccessibilityInfo.isReduceMotionEnabled();
}

export function startLayoutAnimationTrace(
  runId: number,
  scenario: TestBenchScenarioId,
  reducedMotion: boolean
): boolean {
  const proxy = getTraceProxy();
  if (!proxy?._startLayoutAnimationTrace) {
    return false;
  }
  proxy._startLayoutAnimationTrace({
    runId,
    backend: getCompiledLayoutAnimationBackend(),
    scenario,
    environment: {
      platform: Platform.OS === 'android' ? 'android' : 'ios',
      osVersion: String(Platform.Version),
      reducedMotion,
    },
  });
  return true;
}

export function recordLayoutAnimationTraceEvent(
  event: HarnessTraceEvent,
  finished: boolean | null = null,
  callbackCount: number | null = null
): void {
  getTraceProxy()?._recordLayoutAnimationTraceEvent?.(
    event,
    finished,
    callbackCount
  );
}

export function readLayoutAnimationTrace(): string {
  return getTraceProxy()?._getLayoutAnimationTrace?.() ?? '';
}

export function stopLayoutAnimationTrace(): void {
  getTraceProxy()?._stopLayoutAnimationTrace?.();
}

// LayoutAnimationTrace end
