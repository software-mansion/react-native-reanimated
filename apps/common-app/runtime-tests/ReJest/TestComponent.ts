import { findNodeHandle } from 'react-native';
import { getViewProp } from 'react-native-reanimated';

import type { ComponentRef, MountedViewProps, ValidPropNames } from './types';
import { runOnUIBlocking } from './utils/runOnUIBlocking';

export class TestComponent {
  constructor(private ref: ComponentRef) {
    this.ref = ref;
  }

  public getStyle(propName: string) {
    return this.ref.current?.props.style[propName];
  }

  public async getAnimatedStyle(propName: ValidPropNames): Promise<string> {
    const tag = findNodeHandle(this.ref.current) ?? -1;
    return getViewProp(tag, propName, this.ref.current);
  }

  public async getMountedViewProps(): Promise<MountedViewProps | null> {
    const tag = this.getTag();
    return runOnUIBlocking(() => {
      'worklet';
      return global._obtainMountedViewProps(tag);
    });
  }

  public getTag() {
    return findNodeHandle(this.ref.current) ?? -1;
  }
}
