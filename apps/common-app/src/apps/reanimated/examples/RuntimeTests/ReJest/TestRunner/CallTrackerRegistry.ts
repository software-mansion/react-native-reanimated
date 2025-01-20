import { makeMutable } from 'react-native-reanimated';
import type { TrackerCallCount } from '../types';

let callCallTrackerRegistryJS: Record<string, number> = {};
const callCallTrackerRegistryUI = makeMutable<Record<string, number>>({});
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
      if (!callCallTrackerRegistryUI.value[name]) {
        callCallTrackerRegistryUI.value[name] = 0;
      }
      callCallTrackerRegistryUI.value[name]++;
      callCallTrackerRegistryUI.value = { ...callCallTrackerRegistryUI.value };
    } else {
      callTrackerJS(name);
    }
  }

  public getTrackerCallCount(name: string): TrackerCallCount {
    return {
      name,
      onJS: callCallTrackerRegistryJS[name] ?? 0,
      onUI: callCallTrackerRegistryUI.value[name] ?? 0,
    };
  }

  public resetRegistry() {
    callCallTrackerRegistryUI.value = {};
    callCallTrackerRegistryJS = {};
  }
}
