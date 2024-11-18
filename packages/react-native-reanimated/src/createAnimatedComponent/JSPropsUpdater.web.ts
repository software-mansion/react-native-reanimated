'use strict';
import type {
  AnimatedComponentProps,
  IAnimatedComponentInternal,
  InitialComponentProps,
} from './commonTypes';

export default class JSPropsUpdaterWeb {
  public addOnJSPropsChangeListener(
    _animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    // noop
  }

  public removeOnJSPropsChangeListener(
    _animatedComponent: React.Component<
      AnimatedComponentProps<InitialComponentProps>
    > &
      IAnimatedComponentInternal
  ) {
    // noop
  }
}
