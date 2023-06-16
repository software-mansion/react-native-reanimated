import JSReanimated from './JSReanimated';
import { AnimatedStyle, StyleProps } from '../commonTypes';
import { isWeb } from '../PlatformChecker';

let createReactDOMStyle: (style: any) => any;
let createTransformValue: (transform: any) => any;

if (isWeb()) {
  try {
    createReactDOMStyle =
      require('react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle').default;
  } catch (e) {}

  try {
    // React Native Web 0.19+
    createTransformValue =
      require('react-native-web/dist/exports/StyleSheet/preprocess').createTransformValue;
  } catch (e) {}
}

const reanimatedJS = new JSReanimated();

global._makeShareableClone = (c) => c;
global._scheduleOnJS = queueMicrotask;

interface JSReanimatedComponent {
  previousStyle: StyleProps;
  setNativeProps?: (style: StyleProps) => void;
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

    if (typeof component.setNativeProps === 'function') {
      // This is the legacy way to update props on React Native Web <= 0.18.
      // Also, some components (e.g. from react-native-svg) don't have styles
      // and always provide setNativeProps function instead (even on React Native Web 0.19+).
      setNativeProps(component, rawStyles);
    } else if (
      createReactDOMStyle !== undefined &&
      component.style !== undefined
    ) {
      // React Native Web 0.19+ no longer provides setNativeProps function,
      // so we need to update DOM nodes directly.
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

const setNativeProps = (
  component: JSReanimatedComponent,
  style: StyleProps
): void => {
  const previousStyle = component.previousStyle ? component.previousStyle : {};
  const currentStyle = { ...previousStyle, ...style };
  component.previousStyle = currentStyle;
  component.setNativeProps?.({ style: currentStyle });
};

const updatePropsDOM = (
  component: JSReanimatedComponent,
  style: StyleProps
): void => {
  const previousStyle = component.previousStyle ? component.previousStyle : {};
  const currentStyle = { ...previousStyle, ...style };
  component.previousStyle = currentStyle;

  const domStyle = createReactDOMStyle(currentStyle);
  if (Array.isArray(domStyle.transform) && createTransformValue !== undefined) {
    domStyle.transform = createTransformValue(domStyle.transform);
  }
  for (const key in domStyle) {
    (component.style as StyleProps)[key] = domStyle[key];
  }
};

export default reanimatedJS;
