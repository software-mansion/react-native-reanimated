'use strict';

import { logger } from '../common';
import type { AnimatedRefOnRN, AnimatedRefOnUI } from '../hook/commonTypes';
import type { DispatchCommand } from './types';

function dispatchCommandWeb(
  _animatedRef: AnimatedRefOnRN | AnimatedRefOnUI,
  _commandName: string,
  _args: Array<unknown> = []
) {
  logger.warn('dispatchCommand() is not supported on web.');
}

export const dispatchCommand: DispatchCommand =
  dispatchCommandWeb as DispatchCommand;
