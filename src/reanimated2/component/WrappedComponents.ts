import { Image, ScrollView, Text, View } from 'react-native';
import createAnimatedComponent from '../../createAnimatedComponent';

const WrappedComponents = {
  View: createAnimatedComponent(View),
  Text: createAnimatedComponent(Text as any),
  Image: createAnimatedComponent(Image as any),
  ScrollView: createAnimatedComponent(ScrollView),
};

export default WrappedComponents;
