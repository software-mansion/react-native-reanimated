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
import { EmojiWaterfallExample } from './EmojiWaterfallExample';
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
import CubesExample from './CubesExample';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

LogBox.ignoreLogs(['Calling `getNode()`']);

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

type Screens = Record<string, { screen: React.ComponentType; title?: string }>;

const SCREENS: Screens = {
  ColorInterpolation: {
    screen: ColorInterpolationExample,
    title: 'Color interpolation',
  },
  DeleteAncestorOfExiting: {
    screen: DeleteAncestorOfExiting,
    title: '[LA] Deleting view with an exiting animation',
  },
  NestedNativeStacksWithLayout: {
    screen: NestedNativeStacksWithLayout,
    title: '[LA] Nested NativeStacks with layout',
  },
  BasicLayoutAnimation: {
    screen: BasicLayoutAnimation,
    title: '[LA] Basic layout animation',
  },
  BasicNestedAnimation: {
    screen: BasicNestedAnimation,
    title: '[LA] Basic nested animation',
  },
  BasicNestedLayoutAnimation: {
    screen: BasicNestedLayoutAnimation,
    title: '[LA] Basic nested layout animation',
  },
  NestedLayoutAnimations: {
    screen: NestedTest,
    title: '[LA] Nested layout animations',
  },
  CombinedLayoutAnimations: {
    screen: CombinedTest,
    title: '[LA] Entering and Exiting with Layout',
  },
  DefaultAnimations: {
    screen: DefaultAnimations,
    title: '[LA] Default layout animations',
  },
  AnimatedKeyboard: {
    screen: AnimatedKeyboardExample,
    title: 'Use Animated Keyboard',
  },
  AnimatedSensor: {
    screen: AnimatedSensorExample,
    title: 'Use Animated Sensor',
  },
  Cubes: {
    screen: CubesExample,
    title: 'Cubes with useAnimatedSensor',
  },
  FrameCallbackExample: {
    screen: FrameCallbackExample,
    title: 'Frame callback example',
  },
  DefaultTransistions: {
    screen: WaterfallGridExample,
    title: '[LA] Default layout transitions',
  },
  KeyframeAnimation: {
    screen: KeyframeAnimation,
    title: '[LA] Keyframe animation',
  },
  ParticipantList: {
    screen: AnimatedListExample,
    title: '[LA] Participant List',
  },
  OlympicAnimation: {
    screen: OlympicAnimation,
    title: '[LA] Olympic animation',
  },
  CustomLayoutAnimation: {
    screen: CustomLayoutAnimationScreen,
    title: '[LA] Custom layout animation',
  },
  ModalNewAPI: {
    title: '[LA] ModalNewAPI',
    screen: ModalNewAPI,
  },
  SpringLayoutAnimation: {
    title: '[LA] Spring Layout Animation',
    screen: SpringLayoutAnimation,
  },
  MountingUnmounting: {
    title: '[LA] Mounting Unmounting',
    screen: MountingUnmounting,
  },
  ReactionsCounterExample: {
    screen: ReactionsCounterExample,
    title: '[LA] Reactions counter',
  },
  SwipeableList: {
    title: '[LA] Swipeable list',
    screen: SwipeableList,
  },
  Modal: {
    title: '[LA] Modal',
    screen: Modal,
  },
  NativeModals: {
    title: '[LA] Native modals (RN and Screens)',
    screen: NativeModals,
  },
  Carousel: {
    title: '[LA] Carousel',
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
  EmojiWaterfallExample: {
    screen: EmojiWaterfallExample,
    title: 'Emoji Waterfall Example',
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
      options={{ title: '🐎 Reanimated examples' }}
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>{Reanimated2()}</NavigationContainer>
    </GestureHandlerRootView>
  );
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
