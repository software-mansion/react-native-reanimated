'use strict';

import type { Shareable, ShareableHost, ShareableHostDecorator } from './types';

export function __installUnpacker() {
  function shareableHostUnpacker<TValue = unknown>(
    initial: TValue,
    hostDecorator?: ShareableHostDecorator<TValue>
  ): Shareable<TValue> {
    initial =
      typeof initial === 'function' ? (initial as () => TValue)() : initial;

    let hostShareable = {
      isHost: true,
      __shareableRef: true,
      value: initial,
    } as ShareableHost<TValue>;

    if (hostDecorator) {
      hostShareable = hostDecorator(hostShareable);
    }

    const shareable = hostShareable;
    return shareable;
  }

  globalThis.__shareableHostUnpacker = shareableHostUnpacker;
}

export type ShareableHostUnpacker<TValue = unknown> = (
  initial: TValue,
  decorateHost?: ShareableHostDecorator<TValue>
) => Shareable<TValue>;
