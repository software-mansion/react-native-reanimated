import JSReanimated from './JSReanimated';

const reanimatedJS = new JSReanimated();

global._updatePropsJS = (viewTag, updates, viewRef) => {
  const [rawStyles] = Object.keys(updates).reduce(
    (acc, key) => {
      const value = updates[key];

      const index = typeof value === 'function' ? 1 : 0;

      acc[index][key] = value;

      return acc;
    },
    [{}, {}]
  );

  if (viewRef.current._component) {
    viewRef.current._component.setNativeProps({ style: rawStyles });
  }

  // TODO: Handle animations in styles
  // Object.keys(animations).forEach(key => {
  //   const animationCreator = animations[key];

  //   console.log(animationCreator.toString());

  // });

  // reanimatedJS.maybeRequestRender();
};

export default reanimatedJS;
