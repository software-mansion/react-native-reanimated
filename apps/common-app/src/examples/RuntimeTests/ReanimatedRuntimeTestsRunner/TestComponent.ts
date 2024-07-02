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

  // This type makes getAnimatedStyle deduce output type depending on the prop Name
  public async getAnimatedStyle<PropName extends ValidPropNames>(
    propName: PropName,
  ): Promise<PropName extends 'backgroundColor' ? string : number> {
    const tag = findNodeHandle(this.ref.current) ?? -1;
    const propValue = await getViewProp(tag, propName, this.ref.current as Component);

    if (propName === 'backgroundColor') {
      // To create the deduction of the output type we need a typecast here
      return propValue as PropName extends 'backgroundColor' ? string : number;
    }
    return Number(propValue) as PropName extends 'backgroundColor' ? string : number;
  }

  public getTag() {
    return findNodeHandle(this.ref.current) ?? -1;
  }
}
