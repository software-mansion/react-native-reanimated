'use strict';

import type { ScheduleOnUI } from './newAPI/scheduleOn';
import { scheduleOnUI } from './newAPI/scheduleOn';

// We need this file to strip internal types. Internal types are very
// useful when developing the library but can cause issues for
// the end users.

// TODO: TSDoc
/** @param worklet - Placeholder */
const publicScheduleOnUI = scheduleOnUI as ScheduleOnUI;

export { publicScheduleOnUI as scheduleOnUI };
