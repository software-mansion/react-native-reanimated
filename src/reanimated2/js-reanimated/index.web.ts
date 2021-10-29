// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import JSReanimated from './JSReanimated';

const reanimatedJS = new JSReanimated();

global._frameTimestamp = null;

export const _updatePropsJS = (_viewTag, _viewName, updates, viewRef) => {
  if (viewRef.current && viewRef.current._component) {
    const [rawStyles] = Object.keys(updates).reduce(
      (acc, key) => {
        const value = updates[key];
        const index = typeof value === 'function' ? 1 : 0;
        acc[index][key] = value;
        return acc;
      },
      [{}, {}]
    );

    setNativeProps(viewRef._component, rawStyles);
  }
};

const setNativeProps = (component, style) => {
  const previousStyle = component.previousStyle ? component.previousStyle : {};
  const currentStyle = { ...previousStyle, ...style };
  component.previousStyle = currentStyle;
  component.setNativeProps({ style: currentStyle });
};

global._setGlobalConsole = (_val) => {
  // noop
};

export default reanimatedJS;
