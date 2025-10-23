'use strict';

import { logger } from '../common';
import type { AnimatedRefOnJS, AnimatedRefOnUI } from '../hook/commonTypes';
import type { DispatchCommand } from './types';

function dispatchCommandWeb(
  _animatedRef: AnimatedRefOnJS | AnimatedRefOnUI,
  _commandName: string,
  _args: Array<unknown> = []
) {
  logger.warn('dispatchCommand() is not supported on web.');
}

export const dispatchCommand: DispatchCommand =
  dispatchCommandWeb as DispatchCommand;
