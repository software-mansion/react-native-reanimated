import { findNodeHandle } from 'react-native';
import { getViewProp } from 'react-native-reanimated';

import {
  getComparator,
  getComparisonModeForProp,
} from './matchers/Comparators';
import RuntimeTestObserver from './native/NativeRuntimeTestObserver';
import type { ComponentRef, MountedViewProps, ValidPropNames } from './types';
import { runOnUIBlocking } from './utils/runOnUIBlocking';
import { commitsSynchronousProps } from './utils/synchronousProps';

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
      return global._obtainMountedViewProps(tag, false);
    });
  }

  /**
   * Gives the ShadowTree value when the prop goes through the commit, else the
   * mounted value. Gives a text with both values when the mounted view and the
   * ShadowTree are different.
   */
  public async getSynchronousProp(propName: 'opacity' | 'backgroundColor') {
    const mounted = (await this.getMountedViewProps())?.[propName];
    if (!commitsSynchronousProps()) {
      return mounted;
    }
    const shadowTree = await this.getAnimatedStyle(propName);
    const matches = getComparator(getComparisonModeForProp(propName));
    return matches(mounted, shadowTree)
      ? shadowTree
      : `mounted view ${String(mounted)}, ShadowTree ${shadowTree}`;
  }

  /**
   * Reads the props on screen. On iOS, `getMountedViewProps` returns an
   * animation's target as soon as Core Animation starts the animation.
   */
  public async getPresentedViewProps(): Promise<MountedViewProps | null> {
    const tag = this.getTag();
    return runOnUIBlocking(() => {
      'worklet';
      return global._obtainMountedViewProps(tag, true);
    });
  }

  public getTransformObservation() {
    if (!RuntimeTestObserver) {
      throw new Error(
        'RuntimeTestObserver requires a FabricExample runtime-test build'
      );
    }
    return RuntimeTestObserver.observeTransform(this.getTag());
  }

  public getTextInputObservation() {
    if (!RuntimeTestObserver) {
      throw new Error(
        'RuntimeTestObserver requires a FabricExample runtime-test build'
      );
    }
    return RuntimeTestObserver.observeTextInput(this.getTag());
  }

  public getTag() {
    return findNodeHandle(this.ref.current) ?? -1;
  }
}
