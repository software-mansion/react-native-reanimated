import JSReanimated from './JSReanimated';

const reanimatedJS = new JSReanimated();

global._frameTimestamp = null;

global._updatePropsJS = (viewTag, viewName, updates, viewRef) => {
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

global._globalSetter = (name, val) => {
  global[name] = val;
};

export default reanimatedJS;
