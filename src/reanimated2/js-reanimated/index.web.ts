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

    if (typeof viewRef.current._component.setNativeProps === 'function') {
      viewRef.current._component.setNativeProps({ style: rawStyles });
    } else if (Object.keys(viewRef.current._component.props).length > 0) {
      Object.keys(viewRef.current._component.props).forEach((key) => {
        if (!rawStyles[key]) {
          return;
        }
        const dashedKey = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
        viewRef.current._component._touchableNode.setAttribute(
          dashedKey,
          rawStyles[key]
        );
      });
    } else {
      console.warn('It is not possible to manipulate component');
    }
  }
};

global._setGlobalConsole = (_val) => {
  // noop
};

export default reanimatedJS;
