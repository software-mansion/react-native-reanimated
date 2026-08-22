import type { Shareable } from '../src/memory/types';
import { createShareable, UIRuntimeId } from '../src/mock';

describe('mocked createShareable', () => {
  test('returns a working shareable when no config is given', () => {
    const shareable = createShareable(UIRuntimeId, 42);

    expect(shareable.getSync()).toBe(42);
    shareable.setSync(43);
    expect(shareable.getSync()).toBe(43);
    shareable.setAsync((prev: number) => prev + 1);
    expect(shareable.getSync()).toBe(44);
  });

  test('applies the guest decorator before the host decorator', () => {
    const applied: string[] = [];
    const shareable = createShareable(UIRuntimeId, 1, {
      guestDecorator: (mutable) => {
        applied.push('guest');
        return mutable;
      },
      hostDecorator: (mutable) => {
        applied.push('host');
        return mutable;
      },
    });

    expect(applied).toEqual(['guest', 'host']);
    expect((shareable as Shareable<number>).getSync()).toBe(1);
  });

  test('host-side definitions win over guest-side ones', () => {
    // Mirrors how Reanimated decorates mutables: the guest delegates to the
    // host through the UI scheduler, the host defines the real implementation.
    // On the mock's single runtime the host version must win, otherwise the
    // guest delegation would call back into itself.
    const shareable = createShareable(UIRuntimeId, 0, {
      guestDecorator: (mutable) => {
        Object.defineProperty(mutable, 'modify', {
          value: () => 'guest',
          configurable: true,
          writable: true,
        });
        return mutable;
      },
      hostDecorator: (mutable) => {
        Object.defineProperty(mutable, 'modify', {
          value: () => 'host',
          configurable: true,
          writable: true,
        });
        return mutable;
      },
    });

    expect(
      (shareable as Shareable<number> & { modify: () => string }).modify()
    ).toBe('host');
  });

  test('decorators see the initial value and accessors follow a redefined `value`', () => {
    const seen: number[] = [];
    const shareable = createShareable(UIRuntimeId, 5, {
      hostDecorator: (mutable) => {
        const asRecord = mutable as { value: number };
        seen.push(asRecord.value);
        let value = asRecord.value;
        Object.defineProperty(mutable, 'value', {
          get: () => value,
          set: (next: number) => {
            value = next * 2;
          },
          configurable: true,
        });
        return mutable;
      },
    });

    expect(seen).toEqual([5]);
    const decorated = shareable as Shareable<number> & { value: number };
    decorated.setSync(10);
    expect(decorated.value).toBe(20);
    expect(decorated.getSync()).toBe(20);
  });
});
