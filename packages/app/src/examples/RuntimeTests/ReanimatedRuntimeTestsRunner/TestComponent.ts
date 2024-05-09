import { Component } from 'react';
import { findNodeHandle } from 'react-native';
import { getViewProp } from 'react-native-reanimated';
import { ComponentRef } from './types';

export type ValidPropNames = 'zIndex' | 'opacity' | 'width' | 'height' | 'top' | 'left' | 'backgroundColor';

export class TestComponent {
  constructor(private ref: ComponentRef) {}

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
