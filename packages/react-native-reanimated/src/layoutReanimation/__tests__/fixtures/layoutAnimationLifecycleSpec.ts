'use strict';

export type AnimationKind = 'layout' | 'entering' | 'exiting';
export type LifecyclePhase =
  | 'pendingMount'
  | 'scheduled'
  | 'runningNative'
  | 'runningLegacy'
  | 'terminal';
export type TerminalOutcome =
  | 'finished'
  | 'cancelled'
  | 'interrupted'
  | 'rejected'
  | 'failed';
export type LifecycleEvent =
  | 'postMountNative'
  | 'postMountFallback'
  | 'nativeStarted'
  | 'naturalCompletion'
  | 'cancel'
  | 'interrupt'
  | 'missingView'
  | 'executorFailure'
  | 'surfaceTeardown'
  | 'reducedMotion'
  | 'zeroDuration';

export interface LifecycleSpecState {
  readonly kind: AnimationKind;
  readonly phase: LifecyclePhase;
  readonly outcome?: TerminalOutcome;
  readonly callbackResults: readonly boolean[];
  readonly cleanupRequests: number;
  readonly physicalStarts: number;
}

export function createLifecycleSpecState(
  kind: AnimationKind
): LifecycleSpecState {
  return {
    kind,
    phase: 'pendingMount',
    callbackResults: [],
    cleanupRequests: 0,
    physicalStarts: 0,
  };
}

function terminate(
  state: LifecycleSpecState,
  outcome: TerminalOutcome,
  finished: boolean,
  cleanupExitingView = true
): LifecycleSpecState {
  return {
    ...state,
    phase: 'terminal',
    outcome,
    callbackResults: [...state.callbackResults, finished],
    cleanupRequests:
      state.cleanupRequests +
      (state.kind === 'exiting' && cleanupExitingView ? 1 : 0),
  };
}

export function applyLifecycleSpecEvent(
  state: LifecycleSpecState,
  event: LifecycleEvent
): LifecycleSpecState {
  if (state.phase === 'terminal') {
    return state;
  }

  switch (event) {
    case 'postMountNative':
      if (state.phase === 'pendingMount') {
        return { ...state, phase: 'scheduled' };
      }
      break;
    case 'postMountFallback':
      if (state.phase === 'pendingMount') {
        return { ...state, phase: 'runningLegacy' };
      }
      break;
    case 'nativeStarted':
      if (state.phase === 'scheduled') {
        return {
          ...state,
          phase: 'runningNative',
          physicalStarts: state.physicalStarts + 1,
        };
      }
      break;
    case 'naturalCompletion':
      if (state.phase === 'runningNative' || state.phase === 'runningLegacy') {
        return terminate(state, 'finished', true);
      }
      break;
    case 'cancel':
      return terminate(state, 'cancelled', false);
    case 'interrupt':
      if (state.phase === 'runningNative' || state.phase === 'runningLegacy') {
        return terminate(state, 'interrupted', false);
      }
      break;
    case 'missingView':
      if (state.phase === 'scheduled') {
        return terminate(state, 'rejected', false);
      }
      break;
    case 'executorFailure':
      if (state.phase === 'runningNative') {
        return terminate(state, 'failed', false);
      }
      break;
    case 'surfaceTeardown':
      return terminate(state, 'cancelled', false, false);
    case 'reducedMotion':
    case 'zeroDuration':
      if (state.phase === 'pendingMount') {
        return terminate(state, 'finished', true);
      }
      break;
  }

  throw new Error(`[Reanimated] Invalid ${event} event in ${state.phase}`);
}

export function runLifecycleSpec(
  kind: AnimationKind,
  events: readonly LifecycleEvent[]
): LifecycleSpecState {
  return events.reduce(applyLifecycleSpecEvent, createLifecycleSpecState(kind));
}

export interface TargetArbitration {
  readonly coexist: boolean;
  readonly oldGenerationFinished: boolean | undefined;
  readonly preempted: readonly string[];
  readonly transferred: readonly string[];
}

export type AnimationOwner = 'layout' | 'cssTransition' | 'cssAnimation';

export interface TargetClaim {
  readonly owner: AnimationOwner;
  readonly target: string;
  readonly exiting: boolean;
}

export type ClaimDecision = 'coexist' | 'preemptActive' | 'rejectIncoming';

const GEOMETRY_TARGETS = new Set([
  'positionX',
  'positionY',
  'width',
  'height',
  'transform',
]);

export function resolveTargetClaim(
  active: TargetClaim,
  incoming: TargetClaim
): ClaimDecision {
  if (active.target !== incoming.target) {
    return 'coexist';
  }
  if (active.exiting && !incoming.exiting) {
    return 'rejectIncoming';
  }
  if (GEOMETRY_TARGETS.has(active.target)) {
    if (active.owner === 'layout' && incoming.owner !== 'layout') {
      return 'rejectIncoming';
    }
    if (incoming.owner === 'layout' && active.owner !== 'layout') {
      return 'preemptActive';
    }
  }
  return 'preemptActive';
}

export function arbitrateTargets(
  activeTargets: readonly string[],
  incomingTargets: readonly string[]
): TargetArbitration {
  const incoming = new Set(incomingTargets);
  const preempted = activeTargets.filter((target) => incoming.has(target));

  if (preempted.length === 0) {
    return {
      coexist: true,
      oldGenerationFinished: undefined,
      preempted,
      transferred: [],
    };
  }

  return {
    coexist: false,
    oldGenerationFinished: false,
    preempted,
    transferred: activeTargets.filter((target) => !incoming.has(target)),
  };
}
