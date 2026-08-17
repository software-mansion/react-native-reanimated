import { makeMutable, withTiming } from 'react-native-reanimated';

import {
  describe,
  expect,
  notify,
  test,
  waitForNotification,
  beforeEach,
} from '../../../../ReJest/RuntimeTestsApi';
import { scheduleOnRN } from 'react-native-worklets';

const NOTIFY_FIRST_CALLBACK = 'NOTIFY_FIRST_CALLBACK';
const NOTIFY_SECOND_CALLBACK = 'NOTIFY_SECOND_CALLBACK';

describe('Test animation reassignments on mutable', () => {
  let firstCanceled = false;
  let secondCanceled = false;
  const notifyFirst = (finished: boolean) => {
    firstCanceled = !finished;
    notify(NOTIFY_FIRST_CALLBACK);
  };

  const notifySecond = (finished: boolean) => {
    secondCanceled = !finished;
    notify(NOTIFY_SECOND_CALLBACK);
  };

  beforeEach(() => {
    firstCanceled = false;
    secondCanceled = false;
  });

  test('previous animation is canceled on direct assignment', async () => {
    const mutable = makeMutable(0);
    mutable.value = withTiming(100, {}, (finished) => {
      scheduleOnRN(notifyFirst, finished!);
    });

    requestAnimationFrame(() => {
      mutable.value = withTiming(200, {}, (finished) => {
        scheduleOnRN(notifySecond, finished!);
      });
    });

    await waitForNotification(NOTIFY_FIRST_CALLBACK);
    await waitForNotification(NOTIFY_SECOND_CALLBACK);

    expect(firstCanceled).toBe(true);
    expect(secondCanceled).toBe(false);
  });

  test('reassignment in callback', async () => {
    const mutable = makeMutable(0);
    mutable.value = withTiming(100, {}, (finished) => {
      scheduleOnRN(notifyFirst, finished!);
      mutable.value = withTiming(200, {}, (innerFinished) => {
        scheduleOnRN(notifySecond, innerFinished!);
      });
    });

    await waitForNotification(NOTIFY_FIRST_CALLBACK);
    await waitForNotification(NOTIFY_SECOND_CALLBACK);

    expect(firstCanceled).toBe(false);
    expect(secondCanceled).toBe(false);
  });

  test('reassignment both directly and in callback', async () => {
    const mutable = makeMutable(0);
    mutable.value = withTiming(100, {}, (finished) => {
      scheduleOnRN(notifyFirst, finished!);
      mutable.value = withTiming(200, {});
    });

    requestAnimationFrame(() => {
      mutable.value = withTiming(300, {}, (finished) => {
        scheduleOnRN(notifySecond, finished!);
      });
    });

    await waitForNotification(NOTIFY_FIRST_CALLBACK);
    await waitForNotification(NOTIFY_SECOND_CALLBACK);

    expect(firstCanceled).toBe(true);
    expect(secondCanceled).toBe(false);
  });
});
