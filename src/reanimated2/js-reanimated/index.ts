import JSReanimated from './JSReanimated';
import { shouldBeUseWeb } from '../PlatformChecker';
import { AnimatedStyle, StyleProps } from '../commonTypes';

const reanimatedJS = new JSReanimated();

interface JSReanimatedComponent {
  previousStyle: StyleProps;
  setNativeProps: (style: StyleProps) => void;
  props: Record<string, string | number>;
  _touchableNode: {
    setAttribute: (key: string, props: unknown) => void;
  };
}

if (shouldBeUseWeb()) {
  global._frameTimestamp = null;
  global._setGlobalConsole = (_val) => {
    // noop
  };
  global._measure = () => {
    console.warn(
      "[Reanimated] You can't use 'measue' method with Chrome Debugger or with web version"
    );
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      pageX: 0,
      pageY: 0,
    };
  };
  global._scrollTo = () => {
    console.warn(
      "[Reanimated] You can't use 'scrollTo' method with Chrome Debugger or with web version"
    );
  };
  global._setGestureState = () => {
    console.warn(
      "[Reanimated] You can't use 'setGestureState' method with Chrome Debugger or with web version"
    );
  };
}

export const _updatePropsJS = (
  updates: StyleProps | AnimatedStyle,
  viewRef: { _component?: JSReanimatedComponent }
): void => {
  if (viewRef._component) {
    const component = viewRef._component;
    const [rawStyles] = Object.keys(updates).reduce(
      (acc: [StyleProps, AnimatedStyle], key) => {
        const value = updates[key];
        const index = typeof value === 'function' ? 1 : 0;
        acc[index][key] = value;
        return acc;
      },
      [{}, {}]
    );

    if (typeof component.setNativeProps === 'function') {
      setNativeProps(component, rawStyles);
    } else if (Object.keys(component.props).length > 0) {
      Object.keys(component.props).forEach((key) => {
        if (!rawStyles[key]) {
          return;
        }
        const dashedKey = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
        component._touchableNode.setAttribute(dashedKey, rawStyles[key]);
      });
    } else {
      console.warn('It is not possible to manipulate component');
    }
  }
};

const setNativeProps = (
  component: JSReanimatedComponent,
  style: StyleProps
): void => {
  const previousStyle = component.previousStyle ? component.previousStyle : {};
  const currentStyle = { ...previousStyle, ...style };
  component.previousStyle = currentStyle;
  component.setNativeProps({ style: currentStyle });
};

export default reanimatedJS;
