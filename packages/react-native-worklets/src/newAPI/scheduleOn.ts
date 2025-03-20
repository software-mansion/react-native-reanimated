'use strict';

import { runOnUI } from '../threads';
import type { WorkletFunction } from '../workletTypes';

// TODO: TSDoc
/** @param worklet - Todo */
export function scheduleOnUI<ReturnValue>(
  worklet: WorkletFunction<[], ReturnValue>
): void {
  'worklet';
  runOnUI(worklet)();
}

export interface ScheduleOnUI {
  <ReturnValue>(worklet: () => ReturnValue): void;
}
