import type { Component } from 'react';
import { findNodeHandle } from 'react-native';
import { getViewProp } from 'react-native-reanimated';

import type { ComponentRef, ValidPropNames } from './types';

export class TestComponent {
  constructor(private ref: ComponentRef) {
    this.ref = ref;
  }

  public getStyle(propName: string) {
    return this.ref.current?.props.style[propName];
  }

  public async getAnimatedStyle(propName: ValidPropNames): Promise<string> {
    const tag = findNodeHandle(this.ref.current) ?? -1;
    return getViewProp(tag, propName, this.ref.current as Component);
  }

  public getTag() {
    return findNodeHandle(this.ref.current) ?? -1;
  }
}
