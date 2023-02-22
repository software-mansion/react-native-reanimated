import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  LogBox,
  Platform,
  UIManager,
  ScrollView,
  Pressable,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import {
  BasicLayoutAnimation,
  BasicNestedAnimation,
  BasicNestedLayoutAnimation,
  Carousel,
  CombinedTest,
  CustomLayoutAnimationScreen,
  DefaultAnimations,
  DeleteAncestorOfExiting,
  Modal,
  ModalNewAPI,
  MountingUnmounting,
  NativeModals,
  NestedTest,
  NestedNativeStacksWithLayout,
  SpringLayoutAnimation,
  SwipeableList,
} from './LayoutReanimation';

import AnimatedKeyboardExample from './AnimatedKeyboardExample';
import AnimatedListExample from './LayoutReanimation/AnimatedList';
import AnimatedSensorExample from './AnimatedSensorExample';
import AnimatedSharedStyleExample from './AnimatedSharedStyleExample';
import AnimatedStyleUpdateExample from './AnimatedStyleUpdateExample';
import AnimatedTabBarExample from './AnimatedTabBarExample';
import ChatHeadsExample from './ChatHeadsExample';
import DragAndSnapExample from './DragAndSnapExample';
import ExtrapolationExample from './ExtrapolationExample';
import FrameCallbackExample from './FrameCallbackExample';
import InvertedFlatListExample from './InvertedFlatListExample';
import { KeyframeAnimation } from './LayoutReanimation/KeyframeAnimation';
import LightboxExample from './LightboxExample';
import LiquidSwipe from './LiquidSwipe';
import MeasureExample from './MeasureExample';
import { OlympicAnimation } from './LayoutReanimation/OlympicAnimation';
import { PagerExample } from './CustomHandler';
import { ReactionsCounterExample } from './ReactionsCounterExample';
import ScrollEventExample from './ScrollEventExample';
import ScrollExample from './AnimatedScrollExample';
import ScrollToExample from './ScrollToExample';
import ScrollViewOffsetExample from './ScrollViewOffsetExample';
import ScrollableViewExample from './ScrollableViewExample';
import SwipeableListExample from './SwipeableListExample';
import { WaterfallGridExample } from './LayoutReanimation/WaterfallGridExample';
import WobbleExample from './WobbleExample';
import { ColorInterpolationExample } from './ColorInterpolationExample';
import {
  CardExample,
  CustomTransitionExample,
  GalleryExample,
  HeadersExample,
  ImageExample,
  LayoutAnimationExample,
  ManyTagsExample,
  MixedPropsExample,
  ParentMarginExample,
  RestoreStateExample,
} from './SharedElementTransition';
import CubesExample from './CubesExample';

LogBox.ignoreLogs(['Calling `getNode()`']);

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

type Screens = Record<string, { screen: React.ComponentType; title?: string }>;

const SCREENS: Screens = {
  CardExample: {
    screen: CardExample,
    title: '⚠️ [SET] CardExample',
  },
  CustomTransitionExample: {
    screen: CustomTransitionExample,
    title: '⚠️ [SET] CustomTransitionExample',
  },
  GalleryExample: {
    screen: GalleryExample,
    title: '⚠️ [SET] GalleryExample',
  },
  HeadersExample: {
    screen: HeadersExample,
    title: '⚠️ [SET] HeadersExample',
  },
  ImageExample: {
    screen: ImageExample,
    title: '⚠️ [SET] ImageExample',
  },
  LayoutAnimationExample: {
    screen: LayoutAnimationExample,
    title: '⚠️ [SET] LayoutAnimationExample',
  },
  ManyTagsExample: {
    screen: ManyTagsExample,
    title: '⚠️ [SET] ManyTagsExample',
  },
  MixedPropsExample: {
    screen: MixedPropsExample,
    title: '⚠️ [SET] MixedPropsExample',
  },
  ParentMarginExample: {
    screen: ParentMarginExample,
    title: '⚠️ [SET] ParentMarginExample',
  },
  RestoreStateExample: {
    screen: RestoreStateExample,
    title: '⚠️ [SET] RestoreStateExample',
  },
  ColorInterpolation: {
    screen: ColorInterpolationExample,
    title: 'Color interpolation',
  },
  DeleteAncestorOfExiting: {
    screen: DeleteAncestorOfExiting,
    title: '🆕 Deleting view with an exiting animation',
  },
  NestedNativeStacksWithLayout: {
    screen: NestedNativeStacksWithLayout,
    title: '🆕 Nested NativeStacks with layout',
  },
  BasicLayoutAnimation: {
    screen: BasicLayoutAnimation,
    title: '🆕 Basic layout animation',
  },
  BasicNestedAnimation: {
    screen: BasicNestedAnimation,
    title: '🆕 Basic nested animation',
  },
  BasicNestedLayoutAnimation: {
    screen: BasicNestedLayoutAnimation,
    title: '🆕 Basic nested layout animation',
  },
  NestedLayoutAnimations: {
    screen: NestedTest,
    title: '🆕 Nested layout animations',
  },
  CombinedLayoutAnimations: {
    screen: CombinedTest,
    title: '🆕 Entering and Exiting with Layout',
  },
  DefaultAnimations: {
    screen: DefaultAnimations,
    title: '🆕 Default layout animations',
  },
  AnimatedKeyboard: {
    screen: AnimatedKeyboardExample,
    title: '🆕 Use Animated Keyboard',
  },
  AnimatedSensor: {
    screen: AnimatedSensorExample,
    title: '🆕 Use Animated Sensor',
  },
  Cubes: {
    screen: CubesExample,
    title: '🆕 Cubes with useAnimatedSensor',
  },
  FrameCallbackExample: {
    screen: FrameCallbackExample,
    title: '🆕 Frame callback example',
  },
  DefaultTransistions: {
    screen: WaterfallGridExample,
    title: '🆕 Default layout transitions',
  },
  KeyframeAnimation: {
    screen: KeyframeAnimation,
    title: '🆕 Keyframe animation',
  },
  ParticipantList: {
    screen: AnimatedListExample,
    title: '🆕 Participant List',
  },
  OlympicAnimation: {
    screen: OlympicAnimation,
    title: '🆕 Olympic animation',
  },
  CustomLayoutAnimation: {
    screen: CustomLayoutAnimationScreen,
    title: '🆕 Custom layout animation',
  },
  ModalNewAPI: {
    title: '🆕 ModalNewAPI',
    screen: ModalNewAPI,
  },
  SpringLayoutAnimation: {
    title: '🆕 Spring Layout Animation',
    screen: SpringLayoutAnimation,
  },
  MountingUnmounting: {
    title: '🆕 Mounting Unmounting',
    screen: MountingUnmounting,
  },
  ReactionsCounterExample: {
    screen: ReactionsCounterExample,
    title: '🆕 Reactions counter',
  },
  SwipeableList: {
    title: '🆕 Swipeable list',
    screen: SwipeableList,
  },
  Modal: {
    title: '🆕 Modal',
    screen: Modal,
  },
  NativeModals: {
    title: '🆕 Native modals (RN and Screens)',
    screen: NativeModals,
  },
  Carousel: {
    title: 'Carousel',
    screen: Carousel,
  },
  PagerExample: {
    screen: PagerExample,
    title: 'Custom Handler Example - Pager',
  },
  AnimatedStyleUpdate: {
    screen: AnimatedStyleUpdateExample,
    title: 'Animated Style Update',
  },
  AnimatedSharedStyle: {
    screen: AnimatedSharedStyleExample,
    title: 'Animated Shared Style',
  },
  WobbleExample: {
    screen: WobbleExample,
    title: 'Animation Modifiers (Wobble Effect)',
  },
  DragAndSnapExample: {
    screen: DragAndSnapExample,
    title: 'Drag and Snap',
  },
  MeasureExample: {
    screen: MeasureExample,
    title: 'Synchronous Measure',
  },
  ScrollEventExample: {
    screen: ScrollEventExample,
    title: 'Scroll Events',
  },
  ScrollViewOffsetExample: {
    screen: ScrollViewOffsetExample,
    title: 'ScrollView offset',
  },
  ChatHeadsExample: {
    screen: ChatHeadsExample,
    title: 'Chat Heads',
  },
  ScrollableToExample: {
    screen: ScrollToExample,
    title: 'scrollTo',
  },
  SwipeableListExample: {
    screen: SwipeableListExample,
    title: '(advanced) Swipeable List',
  },
  LightboxExample: {
    screen: LightboxExample,
    title: '(advanced) Lightbox',
  },
  ScrollableViewExample: {
    screen: ScrollableViewExample,
    title: '(advanced) ScrollView imitation',
  },
  AnimatedTabBarExample: {
    screen: AnimatedTabBarExample,
    title: '(advanced) Tab Bar Example',
  },
  LiquidSwipe: {
    screen: LiquidSwipe,
    title: 'Liquid Swipe Example',
  },
  ExtrapolationExample: {
    screen: ExtrapolationExample,
    title: 'Extrapolation Example',
  },
  ScrollExample: {
    screen: ScrollExample,
    title: 'Scroll Example',
  },
  InvertedFlatListExample: {
    screen: InvertedFlatListExample,
    title: 'Inverted FlatList Example',
  },
};

type RootStackParams = { Home: undefined } & { [key: string]: undefined };
type MainScreenProps = {
  navigation: StackNavigationProp<RootStackParams, 'Home'>;
};

function MainScreen({ navigation }: MainScreenProps) {
  const data = Object.keys(SCREENS).map((key) => ({ key }));
  return (
    <FlatList
      style={styles.list}
      data={data}
      ItemSeparatorComponent={ItemSeparator}
      renderItem={(props) => (
        <MainScreenItem
          {...props}
          screens={SCREENS}
          onPressItem={({ key }) => navigation.navigate(key)}
        />
      )}
      renderScrollComponent={(props) => <ScrollView {...props} />}
    />
  );
}

export function ItemSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

type Item = { key: string };
type MainScreenItemProps = {
  item: Item;
  onPressItem: ({ key }: Item) => void;
  screens: Screens;
};
export function MainScreenItem({
  item,
  onPressItem,
  screens,
}: MainScreenItemProps): React.ReactElement {
  const { key } = item;
  return (
    <Pressable style={styles.button} onPress={() => onPressItem(item)}>
      <Text style={styles.buttonText}>{screens[key].title || key}</Text>
    </Pressable>
  );
}

const Stack = createNativeStackNavigator();

const Reanimated2 = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Home"
      options={{ title: '🎬 Reanimated 2.x Examples' }}
      children={(props) => <MainScreen {...props} />}
    />
    {Object.keys(SCREENS).map((name) => (
      <Stack.Screen
        key={name}
        name={name}
        getComponent={() => SCREENS[name].screen}
        options={{ title: SCREENS[name].title || name }}
      />
    ))}
  </Stack.Navigator>
);

function App(): React.ReactElement {
  return <NavigationContainer>{Reanimated2()}</NavigationContainer>;
}

export const styles = StyleSheet.create({
  list: {
    backgroundColor: '#EFEFF4',
  },
  separator: {
    height: 1,
    backgroundColor: '#DBDBE0',
  },
  buttonText: {
    backgroundColor: 'transparent',
    color: 'black',
  },
  button: {
    flex: 1,
    height: 60,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default App;
