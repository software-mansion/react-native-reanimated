import JSReanimated from './JSReanimated';

const reanimatedJS = new JSReanimated();

global._updatePropsJS = (viewTag, updates, viewRef) => {
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

    viewRef.current._component.setNativeProps({ style: rawStyles });
  }
};

export default reanimatedJS;
