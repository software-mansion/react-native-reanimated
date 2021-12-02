import { Image, ScrollView, Text, View, LogBox } from 'react-native';
import createAnimatedComponent from './createAnimatedComponent';
import {
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
} from './ConfigHelper';

const Animated = {
  // components
  View: createAnimatedComponent(View),
  Text: createAnimatedComponent(Text),
  Image: createAnimatedComponent(Image),
  ScrollView: createAnimatedComponent(ScrollView),
  createAnimatedComponent,
  // configuration
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
};

export * from './reanimated2';
export default Animated;

// I think we can ignore this message as long as Gesture Handler doesn't
// try to load the Reanimated module. I figured it should be here instead of
// RNGH because this prevents the message from being displayed for all
// versions of RNGH.
LogBox.ignoreLogs([
  'RCTBridge required dispatch_sync to load RNGestureHandlerModule. This may lead to deadlocks',
]);
