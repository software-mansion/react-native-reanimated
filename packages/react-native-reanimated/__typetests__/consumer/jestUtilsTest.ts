import { getAnimatedStyle, setUpTests } from 'react-native-reanimated';

// Regression check for
// https://github.com/software-mansion/react-native-reanimated/issues/11082:
// consumers' TypeScript reads the declarations of `jestUtils/index.ts`, not
// `index.native.ts`, so they have to carry the signatures that Jest runs.

setUpTests();
setUpTests({ fps: 30 });

const opacity: unknown = getAnimatedStyle({ props: {} }).opacity;

// @ts-expect-error `getAnimatedStyle` requires a component
getAnimatedStyle();

declare const matchers: jest.Matchers<void>;
matchers.toHaveAnimatedStyle({ opacity: 1 }, { shouldMatchAllProps: true });
matchers.toHaveAnimatedProps({ text: 'text' });

// @ts-expect-error `toHaveAnimatedStyle` requires a style
matchers.toHaveAnimatedStyle();
// @ts-expect-error `toHaveAnimatedProps` requires props
matchers.toHaveAnimatedProps();

export { opacity };
