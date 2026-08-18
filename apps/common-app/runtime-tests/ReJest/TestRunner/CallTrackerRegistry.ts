import { createSynchronizable } from 'react-native-worklets';

import type { TrackerCallCount } from '../types';
import { runOnUIBlocking } from '../utils/runOnUIBlocking';

let callCallTrackerRegistryJS: Record<string, number> = {};
const callCallTrackerRegistryUI = createSynchronizable<Record<string, number>>(
  {}
);
function callTrackerJS(name: string) {
  if (!callCallTrackerRegistryJS[name]) {
    callCallTrackerRegistryJS[name] = 0;
  }
  callCallTrackerRegistryJS[name]++;
}

export class CallTrackerRegistry {
  public callTracker(name: string) {
    'worklet';
    if (_WORKLET) {
      callCallTrackerRegistryUI.setBlocking((prev) => {
        return { ...prev, [name]: (prev[name] ?? 0) + 1 };
      });
    } else {
      callTrackerJS(name);
    }
  }

  public async getTrackerCallCount(name: string): Promise<TrackerCallCount> {
    const onUI = await runOnUIBlocking(
      () => {
        'worklet';
        return callCallTrackerRegistryUI.getBlocking()[name] ?? 0;
      },
      undefined,
      `the UI runtime to report the call count of '${name}'`
    );

    return {
      name,
      onJS: callCallTrackerRegistryJS[name] ?? 0,
      onUI,
    };
  }

  public resetRegistry() {
    callCallTrackerRegistryUI.setBlocking({});
    callCallTrackerRegistryJS = {};
  }
}
