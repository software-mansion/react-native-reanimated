import JSReanimated from './JSReanimated';
import { AnimatedStyle, StyleProps } from '../commonTypes';
import createReactDOMStyle from 'react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle';
import { createTransformValue } from 'react-native-web/dist/exports/StyleSheet/preprocess';

const reanimatedJS = new JSReanimated();

global._makeShareableClone = (c) => c;
global._scheduleOnJS = queueMicrotask;

interface JSReanimatedComponent {
  previousStyle: StyleProps;
  style?: StyleProps;
  props: Record<string, string | number>;
  _touchableNode: {
    setAttribute: (key: string, props: unknown) => void;
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

    if (component.style !== undefined) {
      updatePropsDOM(component, rawStyles);
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

const updatePropsDOM = (
  component: JSReanimatedComponent,
  style: StyleProps
): void => {
  const previousStyle = component.previousStyle ? component.previousStyle : {};
  const currentStyle = { ...previousStyle, ...style };
  component.previousStyle = currentStyle;

  const domStyle = createReactDOMStyle(currentStyle);
  if (domStyle.transform) {
    domStyle.transform = createTransformValue(domStyle.transform);
  }
  for (const key in domStyle) {
    (component.style as StyleProps)[key] = domStyle[key];
  }
};

export default reanimatedJS;
