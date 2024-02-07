import React from 'react';
import { findNodeHandle } from 'react-native';
import { getViewProp } from 'react-native-reanimated';

type validPropNames =
  | 'zIndex'
  | 'opacity'
  | 'width'
  | 'height'
  | 'top'
  | 'left'
  | 'backgroundColor';

export class TestComponent {
  constructor(
    private ref: React.MutableRefObject<
      React.Component & { props: { style: Record<string, unknown> } }
    >
  ) {}

  public getStyle(propName: string) {
    return this.ref.current.props.style[propName];
  }

  public async getAnimatedStyle(propName: validPropNames) {
    const tag = findNodeHandle(this.ref.current) ?? -1;
    return getViewProp(tag, propName, this.ref.current);
  }

  public getTag() {
    return findNodeHandle(this.ref.current) ?? -1;
  }
}
