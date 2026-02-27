'use strict';

import type {
  PureShareableHost,
  Shareable,
  ShareableHostDecorator,
} from './types';

export function __installUnpacker() {
  /**
   * @param shareableRef - Is of type {@link SerializableRef} on the Ref Runtime
   *   side and of type {@link Shareable} on the Host Runtime side.
   * @param isHost - Whether the unpacker is running on the Host Runtime side.
   * @param initial - Initial value to use when running on the Host Runtime
   *   side. Undefined on the Ref Runtime side.
   */
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
    } as PureShareableHost<TValue>;

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
