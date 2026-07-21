import { createSynchronizable } from 'react-native-worklets';

import type { TrackerCallCount } from '../types';

let callCallTrackerRegistryJS: Record<string, number> = {};
const callCallTrackerRegistryUI = createSynchronizable<
  Record<string, number>
>({});
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

  public getTrackerCallCount(name: string): TrackerCallCount {
    return {
      name,
      onJS: callCallTrackerRegistryJS[name] ?? 0,
      onUI: callCallTrackerRegistryUI.getBlocking()[name] ?? 0,
    };
  }

  public resetRegistry() {
    callCallTrackerRegistryUI.setBlocking({});
    callCallTrackerRegistryJS = {};
  }
}
