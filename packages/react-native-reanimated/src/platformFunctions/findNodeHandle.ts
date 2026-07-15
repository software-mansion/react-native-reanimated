'use strict';

import type { Component, ComponentClass } from 'react';
import type { findNodeHandle as findNodeHandleRN } from 'react-native';

function findNodeHandleWeb(
  componentOrHandle:
    | null
    | number
    | Component<unknown, unknown>
    | ComponentClass<unknown>
) {
  return componentOrHandle;
}

export const findNodeHandle: typeof findNodeHandleRN =
  findNodeHandleWeb as typeof findNodeHandleRN;
