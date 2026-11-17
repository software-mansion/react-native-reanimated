'use strict';

import type { NetworkingEventListener } from './events';
import { EventTargetLite } from './events';

export class AbortSignal extends EventTargetLite {
  aborted = false;
  reason: unknown = undefined;
  onabort: NetworkingEventListener | null = null;

  static abort(reason?: unknown): AbortSignal {
    const signal = new AbortSignal();
    signal.__abort(reason);
    return signal;
  }

  static timeout(delayMs: number): AbortSignal {
    const signal = new AbortSignal();
    setTimeout(() => signal.__abort(makeAbortError('TimeoutError')), delayMs);
    return signal;
  }

  throwIfAborted() {
    if (this.aborted) {
      throw this.reason;
    }
  }

  __abort(reason?: unknown) {
    if (this.aborted) {
      return;
    }
    this.aborted = true;
    this.reason = reason !== undefined ? reason : makeAbortError('AbortError');
    this.__dispatch('abort');
  }
}

export class AbortController {
  readonly signal = new AbortSignal();

  abort(reason?: unknown) {
    this.signal.__abort(reason);
  }
}

function makeAbortError(name: string): Error {
  const error = new Error(
    `[Worklets] ${
      name === 'TimeoutError'
        ? 'The operation timed out.'
        : 'The operation was aborted.'
    }`
  );
  error.name = name;
  return error;
}
