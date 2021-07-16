// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import JSReanimated from './JSReanimated';

const reanimatedJS = new JSReanimated();

global._frameTimestamp = null;

export const _updatePropsJS = (updates, viewRef) => {
  if (viewRef?._component) {
    const [rawStyles] = Object.keys(updates).reduce(
      (acc, key) => {
        const value = updates[key];
        const index = typeof value === 'function' ? 1 : 0;
        acc[index][key] = value;
        return acc;
      },
      [{}, {}]
    );

    if (typeof viewRef._component.setNativeProps === 'function') {
      viewRef._component.setNativeProps({ style: rawStyles });
    } else if (Object.keys(viewRef._component.props).length > 0) {
      Object.keys(viewRef._component.props).forEach((key) => {
        if (!rawStyles[key]) {
          return;
        }
        const dashedKey = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
        viewRef._component._touchableNode.setAttribute(
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
