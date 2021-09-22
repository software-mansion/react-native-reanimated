import { Image, ScrollView, Text, View } from 'react-native';
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
