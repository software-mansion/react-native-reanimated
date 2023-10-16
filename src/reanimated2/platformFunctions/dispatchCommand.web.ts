'use strict';
import type { AnimatedRef } from '../hook/commonTypes';
import type { Component } from 'react';

export const dispatchCommand: <T extends Component>(
  animatedRef: AnimatedRef<T>,
  commandName: string,
  args?: Array<unknown>
) => void = () => {
  console.warn('[Reanimated] dispatchCommand() is not supported on web.');
};
