import { findNodeHandle } from 'react-native';
import { getViewProp } from 'react-native-reanimated';

import { getComparator } from './matchers/Comparators';
import RuntimeTestObserver from './native/NativeRuntimeTestObserver';
import type { ComponentRef, MountedViewProps, ValidPropNames } from './types';
import { ComparisonMode } from './types';
import { runOnUIBlocking } from './utils/runOnUIBlocking';
import { commitsSynchronousProps } from './utils/synchronousProps';

const SYNCHRONOUS_PROP_COMPARISON = {
  opacity: ComparisonMode.FLOAT_DISTANCE,
  backgroundColor: ComparisonMode.COLOR,
} as const;

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
   * Reads the prop from the mounted view. When the prop goes through the
   * ShadowTree commit, a ShadowTree value that is different gives a text with
   * both values.
   */
  public async getSynchronousProp(
    propName: keyof typeof SYNCHRONOUS_PROP_COMPARISON
  ) {
    const mounted = (await this.getMountedViewProps())?.[propName];
    if (!commitsSynchronousProps()) {
      return mounted;
    }
    const shadowTree = await this.getAnimatedStyle(propName);
    const matches = getComparator(SYNCHRONOUS_PROP_COMPARISON[propName]);
    return matches(mounted, shadowTree)
      ? mounted
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
