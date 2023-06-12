export { default as createAnimatedComponent } from './createAnimatedComponent';
export {
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
} from './ConfigHelper';

export { AnimatedText as Text } from './reanimated2/component/Text';
export { AnimatedView as View } from './reanimated2/component/View';
export { AnimatedScrollView as ScrollView } from './reanimated2/component/ScrollView';
export { AnimatedImage as Image } from './reanimated2/component/Image';
export { ReanimatedFlatList as FlatList } from './reanimated2/component/FlatList';
export type { SharedValue } from './reanimated2/commonTypes';
export type { AnimateStyle } from './reanimated2/helperTypes';
