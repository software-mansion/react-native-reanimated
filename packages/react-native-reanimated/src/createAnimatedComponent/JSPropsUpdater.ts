'use strict';
import type {
  AnimatedComponentProps,
  IAnimatedComponentInternal,
  IJSPropsUpdater,
  InitialComponentProps,
  JSPropsOperation,
} from './commonTypes';

class JSPropsUpdaterWeb implements IJSPropsUpdater {
  public registerComponent(
    _animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    // noop
  }

  public unregisterComponent(
    _animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    // noop
  }

  public updateProps(_operations: JSPropsOperation[]) {
    // noop
  }
}

const jsPropsUpdater = new JSPropsUpdaterWeb();

export default jsPropsUpdater;
