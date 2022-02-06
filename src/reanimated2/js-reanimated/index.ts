import JSReanimated from './JSReanimated';
import { shouldBeUseWeb } from '../PlatformChecker';
import { AnimatedStyle, StyleProps } from '../commonTypes';
import { Platform } from 'react-native';

const reanimatedJS = new JSReanimated();

declare class TaroElementStyle {
  _usedStyleProp: Set<string>;
  _value: Partial<CSSStyleDeclaration>;
  private setCssVariables;
  get cssText(): string;
  set cssText(str: string);
  setProperty(propertyName: string, value?: string | null): void;
  removeProperty(propertyName: string): string;
  getPropertyValue(propertyName: string): any;
}

interface JSReanimatedComponent {
  state: { style: StyleProps };
  setState: (state: unknown) => void;
  style?: TaroElementStyle;
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

const stylePropsWithoutAnimatedStyle = (
  updates: StyleProps | AnimatedStyle
): StyleProps => {
  const [rawStyles] = Object.keys(updates).reduce(
    (acc: [StyleProps, AnimatedStyle], key) => {
      const value = updates[key];
      const index = typeof value === 'function' ? 1 : 0;
      acc[index][key] = value;
      return acc;
    },
    [{}, {}]
  );
  return rawStyles;
};

export const makeH5StyleProps = (
  updates: StyleProps | AnimatedStyle,
  rawStyles = stylePropsWithoutAnimatedStyle(updates)
): StyleProps => {
  const transformList: string[] = [];
  const styles: Record<string, any> = {};
  Object.keys(rawStyles).forEach((key) => {
    if (key === 'transform') {
      rawStyles.transform!.forEach((item) => {
        Object.keys(item).forEach((transformKey) => {
          transformList.push(
            `${transformKey}(${
              ((item as unknown) as Record<string, string>)[transformKey]
            })`
          );
        });
      });
      styles.transform = transformList.join(' ');
    } else {
      // will be parsed by Yoga, no need to transform key to dashed format
      // const dashedKey = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
      styles[key] = rawStyles[key];
    }
  });

  return styles;
};

export const _updatePropsJS = (
  updates: StyleProps | AnimatedStyle,
  viewRef: any
): void => {
  if (viewRef._component) {
    const component = viewRef._component;
    const rawStyles = stylePropsWithoutAnimatedStyle(updates);

    if (typeof component.setNativeProps === 'function') {
      setNativeProps(component, rawStyles);
    } else if (Platform.OS !== 'web' && !component.style) {
      // Taro RN compliant
      const previousStyle = viewRef.state.style;
      viewRef.setState({ style: { ...previousStyle, ...rawStyles } });
    } else if (Platform.OS === 'web' && component.style) {
      // Taro H5 / Weapp compliant
      const styles = makeH5StyleProps(updates, rawStyles);
      const previousStyle = viewRef.state.style;
      viewRef.setState({ style: { ...previousStyle, ...styles } });
    } else if (
      component._touchableNode &&
      component.props &&
      Object.keys(component.props).length > 0
    ) {
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
