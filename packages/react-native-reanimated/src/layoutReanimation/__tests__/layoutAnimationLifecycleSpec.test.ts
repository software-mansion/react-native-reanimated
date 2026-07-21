'use strict';

import type {
  AnimationKind,
  LifecycleEvent,
  TerminalOutcome,
} from './fixtures/layoutAnimationLifecycleSpec';
import {
  arbitrateTargets,
  resolveTargetClaim,
  runLifecycleSpec,
} from './fixtures/layoutAnimationLifecycleSpec';

interface LifecycleCase {
  readonly name: string;
  readonly kind: AnimationKind;
  readonly events: readonly LifecycleEvent[];
  readonly outcome: TerminalOutcome;
  readonly callback: boolean;
  readonly cleanupRequests: number;
  readonly physicalStarts: number;
}

const lifecycleCases: readonly LifecycleCase[] = [
  {
    name: 'natural native layout completion',
    kind: 'layout',
    events: ['postMountNative', 'nativeStarted', 'naturalCompletion'],
    outcome: 'finished',
    callback: true,
    cleanupRequests: 0,
    physicalStarts: 1,
  },
  {
    name: 'natural legacy fallback exit completion',
    kind: 'exiting',
    events: ['postMountFallback', 'naturalCompletion'],
    outcome: 'finished',
    callback: true,
    cleanupRequests: 1,
    physicalStarts: 0,
  },
  {
    name: 'pre-start cancellation',
    kind: 'entering',
    events: ['postMountNative', 'cancel'],
    outcome: 'cancelled',
    callback: false,
    cleanupRequests: 0,
    physicalStarts: 0,
  },
  {
    name: 'pre-start exiting cancellation',
    kind: 'exiting',
    events: ['postMountNative', 'cancel'],
    outcome: 'cancelled',
    callback: false,
    cleanupRequests: 1,
    physicalStarts: 0,
  },
  {
    name: 'missing exiting view',
    kind: 'exiting',
    events: ['postMountNative', 'missingView'],
    outcome: 'rejected',
    callback: false,
    cleanupRequests: 1,
    physicalStarts: 0,
  },
  {
    name: 'running interruption',
    kind: 'layout',
    events: ['postMountNative', 'nativeStarted', 'interrupt'],
    outcome: 'interrupted',
    callback: false,
    cleanupRequests: 0,
    physicalStarts: 1,
  },
  {
    name: 'executor failure during exit',
    kind: 'exiting',
    events: ['postMountNative', 'nativeStarted', 'executorFailure'],
    outcome: 'failed',
    callback: false,
    cleanupRequests: 1,
    physicalStarts: 1,
  },
  {
    name: 'reduced-motion exit',
    kind: 'exiting',
    events: ['reducedMotion'],
    outcome: 'finished',
    callback: true,
    cleanupRequests: 1,
    physicalStarts: 0,
  },
  {
    name: 'zero-duration entering',
    kind: 'entering',
    events: ['zeroDuration'],
    outcome: 'finished',
    callback: true,
    cleanupRequests: 0,
    physicalStarts: 0,
  },
  {
    name: 'surface teardown with retained exit',
    kind: 'exiting',
    events: ['postMountNative', 'nativeStarted', 'surfaceTeardown'],
    outcome: 'cancelled',
    callback: false,
    cleanupRequests: 0,
    physicalStarts: 1,
  },
];

describe('Objective 03 layout-animation lifecycle contract', () => {
  test.each(lifecycleCases)('$name', (fixture) => {
    const result = runLifecycleSpec(fixture.kind, fixture.events);

    expect(result).toMatchObject({
      phase: 'terminal',
      outcome: fixture.outcome,
      cleanupRequests: fixture.cleanupRequests,
      physicalStarts: fixture.physicalStarts,
    });
    expect(result.callbackResults).toEqual([fixture.callback]);
  });

  test('ignores every late event after terminal completion', () => {
    const result = runLifecycleSpec('exiting', [
      'postMountNative',
      'cancel',
      'nativeStarted',
      'naturalCompletion',
      'executorFailure',
    ]);

    expect(result.callbackResults).toEqual([false]);
    expect(result.cleanupRequests).toBe(1);
    expect(result.physicalStarts).toBe(0);
  });

  test('fallback itself does not complete the logical animation', () => {
    expect(runLifecycleSpec('layout', ['postMountFallback'])).toMatchObject({
      phase: 'runningLegacy',
      callbackResults: [],
      cleanupRequests: 0,
      physicalStarts: 0,
    });
  });

  test.each([
    { events: [] as const },
    { events: ['postMountNative'] as const },
    { events: ['postMountNative', 'nativeStarted'] as const },
    { events: ['postMountFallback'] as const },
  ])('surface teardown terminates from nonterminal path %#', ({ events }) => {
    const result = runLifecycleSpec('exiting', [...events, 'surfaceTeardown']);

    expect(result).toMatchObject({
      phase: 'terminal',
      outcome: 'cancelled',
      callbackResults: [false],
      cleanupRequests: 0,
    });
  });
});

describe('Objective 03 target arbitration contract', () => {
  test('allows disjoint targets to coexist', () => {
    expect(arbitrateTargets(['positionX', 'positionY'], ['opacity'])).toEqual({
      coexist: true,
      oldGenerationFinished: undefined,
      preempted: [],
      transferred: [],
    });
  });

  test('interrupts the old generation and transfers unaffected tracks', () => {
    expect(
      arbitrateTargets(
        ['positionX', 'positionY', 'opacity'],
        ['positionY', 'scale']
      )
    ).toEqual({
      coexist: false,
      oldGenerationFinished: false,
      preempted: ['positionY'],
      transferred: ['positionX', 'opacity'],
    });
  });

  test('gives a retained exit priority over a later conflicting claim', () => {
    expect(
      resolveTargetClaim(
        { owner: 'layout', target: 'opacity', exiting: true },
        { owner: 'cssAnimation', target: 'opacity', exiting: false }
      )
    ).toBe('rejectIncoming');
  });

  test('keeps geometry layout-owned in the initial shared policy', () => {
    const layoutPosition = {
      owner: 'layout' as const,
      target: 'positionX',
      exiting: false,
    };
    const cssPosition = {
      owner: 'cssTransition' as const,
      target: 'positionX',
      exiting: false,
    };

    expect(resolveTargetClaim(layoutPosition, cssPosition)).toBe(
      'rejectIncoming'
    );
    expect(resolveTargetClaim(cssPosition, layoutPosition)).toBe(
      'preemptActive'
    );
  });
});
