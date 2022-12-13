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
} from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import {
  createStackNavigator,
  StackNavigationProp,
} from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import {
  Carousel,
  CustomLayoutAnimationScreen,
  DefaultAnimations,
  Modal,
  ModalNewAPI,
  MountingUnmounting,
  SpringLayoutAnimation,
  SwipeableList,
  NativeModals,
  NestedTest,
  CombinedTest,
  BasicNestedLayoutAnimation,
  BasicNestedAnimation,
  BasicLayoutAnimation,
} from './LayoutReanimation';

import AnimatedStyleUpdateExample from './AnimatedStyleUpdateExample';
import AnimatedTabBarExample from './AnimatedTabBarExample';
import ChatHeadsExample from './ChatHeadsExample';
import { PagerExample } from './CustomHandler';
import DragAndSnapExample from './DragAndSnapExample';
import ExtrapolationExample from './ExtrapolationExample';
import { KeyframeAnimation } from './LayoutReanimation/KeyframeAnimation';
import FrameCallbackExample from './FrameCallbackExample';
import LightboxExample from './LightboxExample';
import LiquidSwipe from './LiquidSwipe';
import MeasureExample from './MeasureExample';
import { OlympicAnimation } from './LayoutReanimation/OlympicAnimation';
import { ReactionsCounterExample } from './ReactionsCounterExample';
import ScrollEventExample from './ScrollEventExample';
import ScrollExample from './AnimatedScrollExample';
import ScrollToExample from './ScrollToExample';
import ScrollableViewExample from './ScrollableViewExample';
import SwipeableListExample from './SwipeableListExample';
import WobbleExample from './WobbleExample';
import AnimatedListExample from './LayoutReanimation/AnimatedList';
import { WaterfallGridExample } from './LayoutReanimation/WaterfallGridExample';
import AnimatedSensorExample from './AnimatedSensorExample';
import AnimatedSharedStyleExample from './AnimatedSharedStyleExample';
import AnimatedKeyboardExample from './AnimatedKeyboardExample';
import ScrollViewOffsetExample from './ScrollViewOffsetExample';
import { CardExample } from './SharedElementTransition';

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
    title: '⚠️ [SET] Card',
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
    <RectButton style={styles.button} onPress={() => onPressItem(item)}>
      <Text style={styles.buttonText}>{screens[key].title || key}</Text>
    </RectButton>
  );
}

const Stack = createStackNavigator();

const Reanimated2 = () => (
  <Stack.Navigator detachInactiveScreens={false}>
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
