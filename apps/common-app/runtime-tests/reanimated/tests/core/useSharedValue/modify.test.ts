import { makeMutable } from 'react-native-reanimated';
import { runOnUIAsync, runOnUISync } from 'react-native-worklets';

import { describe, expect, test } from '../../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../../ReJest/types';

const LISTENER_ID = 1;

function pushMutation(value: Array<number>) {
  'worklet';
  value.push(value.length + 1);
  return value;
}

/**
 * Subscribes to the shared value on the UI runtime and records the length
 * reported by every notification. Listeners can only be attached on the UI
 * runtime, so the whole exercise runs there.
 */
function recordNotifications(
  sv: ReturnType<typeof makeMutable<Array<number>>>,
  mutate: (value: typeof sv) => void
) {
  return runOnUISync(() => {
    'worklet';
    const log: Array<number> = [];
    sv.addListener(LISTENER_ID, (value) => {
      'worklet';
      log.push(value.length);
    });

    mutate(sv);

    sv.removeListener(LISTENER_ID);
    return log;
  });
}

describe('_modify_ on sharedValue', () => {
  test('modify called on the RN runtime is asynchronous', () => {
    const sv = makeMutable([1]);

    sv.modify(pushMutation);

    expect(sv.value).toBe([1], ComparisonMode.ARRAY);
  });

  test('modify called on the RN runtime is applied on the UI runtime', async () => {
    const sv = makeMutable([1]);

    sv.modify(pushMutation);

    const onUI = await runOnUIAsync(() => {
      'worklet';
      return sv.value.length;
    });

    expect(onUI).toBe(2);
  });

  test('modify called on the UI runtime is visible on the RN runtime', () => {
    const sv = makeMutable([1]);

    runOnUISync(() => {
      'worklet';
      sv.modify(pushMutation);
    });

    expect(sv.value).toBe([1, 2], ComparisonMode.ARRAY);
  });

  test('modify replaces the value with the modifier result', () => {
    const sv = makeMutable([1]);

    runOnUISync(() => {
      'worklet';
      sv.modify(() => {
        'worklet';
        return [7, 8];
      });
    });

    expect(sv.value).toBe([7, 8], ComparisonMode.ARRAY);
  });

  test('modify without a modifier keeps the value unchanged', () => {
    const sv = makeMutable([1, 2]);

    runOnUISync(() => {
      'worklet';
      sv.modify();
    });

    expect(sv.value).toBe([1, 2], ComparisonMode.ARRAY);
  });

  test('modify notifies listeners although the value identity is unchanged', () => {
    const sv = makeMutable([1]);

    const log = recordNotifications(sv, (value) => {
      'worklet';
      value.modify(pushMutation);
    });

    expect(log).toBe([2], ComparisonMode.ARRAY);
  });

  test('modify without a modifier notifies listeners', () => {
    const sv = makeMutable([1]);

    const log = recordNotifications(sv, (value) => {
      'worklet';
      value.modify();
    });

    expect(log).toBe([1], ComparisonMode.ARRAY);
  });

  test('modify with forceUpdate disabled does not notify listeners', () => {
    const sv = makeMutable([1]);

    const log = recordNotifications(sv, (value) => {
      'worklet';
      value.modify(undefined, false);
    });

    expect(log).toBe([], ComparisonMode.ARRAY);
  });

  test('modify with forceUpdate disabled does not notify listeners after an in-place mutation', () => {
    const sv = makeMutable([1]);

    const log = recordNotifications(sv, (value) => {
      'worklet';
      value.modify(pushMutation, false);
    });

    expect(log).toBe([], ComparisonMode.ARRAY);
  });

  test('assigning a new value notifies listeners', () => {
    const sv = makeMutable([1]);

    const log = recordNotifications(sv, (value) => {
      'worklet';
      value.value = [1, 2, 3];
    });

    expect(log).toBe([3], ComparisonMode.ARRAY);
  });
});
