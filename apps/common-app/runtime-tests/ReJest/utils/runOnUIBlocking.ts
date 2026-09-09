import { runOnUIAsync } from 'react-native-worklets';

import { DEFAULT_TIMEOUT_MS, withTimeout } from './waitFor';

export function runOnUIBlocking<TReturn>(
  worklet: () => TReturn,
  maxWaitTime: number = DEFAULT_TIMEOUT_MS,
  description = 'a worklet to run on the UI runtime'
) {
  return withTimeout(runOnUIAsync(worklet), {
    description,
    timeout: maxWaitTime,
  });
}
