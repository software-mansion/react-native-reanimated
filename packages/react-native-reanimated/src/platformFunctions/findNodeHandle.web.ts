'use strict';
import type { Component, ComponentClass } from 'react';

export function findNodeHandle(
  componentOrHandle: null | number | Component<any, any> | ComponentClass<any>
) {
  return componentOrHandle;
}
