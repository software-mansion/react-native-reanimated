import { WorkletsError } from './WorkletsError';

export enum RuntimeKind {
  /**
   * The React Native runtime, which is the main runtime for React Native where
   * React exists.
   */
  ReactNative = 1,
  /**
   * The UI runtime, which is a special runtime that executes on the UI thread,
   * mostly used for animations and gestures.
   */
  UI = 2,
  /** Additional runtime created on-demand by the user. */
  Worker = 3,
}

/**
 * Returns the kind of the current runtime. It's useful when you need specific
 * implementations for different runtimes created by Worklets.
 *
 * @returns The kind of the current runtime.
 */
export function getRuntimeKind(): RuntimeKind {
  'worklet';
  const kind = globalThis._RUNTIME_KIND;
  switch (kind) {
    case RuntimeKind.ReactNative:
      return RuntimeKind.ReactNative;
    case RuntimeKind.UI:
      return RuntimeKind.UI;
    case RuntimeKind.Worker:
      return RuntimeKind.Worker;
    default:
      throw new WorkletsError(`Unknown runtime kind: ${kind}`);
  }
}
