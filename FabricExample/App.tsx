import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';

import AnimatedKeyboardExample from './src/AnimatedKeyboardExample';
import AnimatedSensorExample from './src/AnimatedSensorExample';
import FrameCallbackExample from './src/FrameCallbackExample';
import AnimatedTextInputExample from './src/AnimatedTextInputExample';
import AnimatedTextWidthExample from './src/AnimatedTextWidthExample';
import BokehExample from './src/BokehExample';
import BouncingBoxExample from './src/BouncingBoxExample';
import BubblesExample from './src/BubblesExample';
import ChessboardExample from './src/ChessboardExample';
import ColorExample from './src/ColorExample';
import EmptyExample from './src/EmptyExample';
import GestureHandlerExample from './src/GestureHandlerExample';
import MeasureExample from './src/MeasureExample';
import NewestShadowNodesRegistryRemoveExample from './src/NewestShadowNodesRegistryRemoveExample';
import React from 'react';
import {
  GestureHandlerRootView,
  RectButton,
} from 'react-native-gesture-handler';
import RefExample from './src/RefExample';
import ScreenStackExample from './src/ScreenStackExample';
import ScreenStackHeaderConfigBackgroundColorExample from './src/ScreenStackHeaderConfigBackgroundColorExample';
import ScrollToExample from './src/ScrollToExample';
import ScrollViewExample from './src/ScrollViewExample';
import TransformExample from './src/TransformExample';
import WidthExample from './src/WidthExample';
import WorkletExample from './src/WorkletExample';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const EXAMPLES = [
  {
    name: 'AnimatedKeyboardExample',
    icon: '⌨️',
    title: 'Animated keyboard example',
    component: AnimatedKeyboardExample,
  },
  {
    name: 'AnimatedTextInputExample',
    icon: '🎰',
    title: 'Animated.TextInput value',
    component: AnimatedTextInputExample,
  },
  {
    name: 'AnimatedTextWidthExample',
    icon: '✂️',
    title: 'Animated.Text width',
    component: AnimatedTextWidthExample,
  },
  {
    name: 'BokehExample',
    icon: '✨',
    title: 'Bokeh',
    component: BokehExample,
  },
  {
    name: 'BubblesExample',
    icon: '🫧',
    title: 'Bubbles',
    component: BubblesExample,
  },
  {
    name: 'ColorExample',
    icon: '🌈',
    title: 'Colors',
    component: ColorExample,
  },
  {
    name: 'ScreenStackHeaderConfigBackgroundColorExample',
    icon: '🎨',
    title: 'Screen header background color',
    component: ScreenStackHeaderConfigBackgroundColorExample,
  },
  {
    name: 'ScreenStackExample',
    icon: '🥞',
    title: 'Screen stack',
    component: ScreenStackExample,
  },
  {
    name: 'GestureHandlerExample',
    icon: '👌',
    title: 'Draggable circle',
    component: GestureHandlerExample,
  },
  {
    name: 'BouncingBoxExample',
    icon: '📦',
    title: 'Bouncing box',
    component: BouncingBoxExample,
  },
  {
    name: 'AnimatedSensorExample',
    icon: '📡',
    title: 'useAnimatedSensor',
    component: AnimatedSensorExample,
  },
  {
    name: 'FrameCallbackExample',
    icon: '🗣',
    title: 'useFrameCallback',
    component: FrameCallbackExample,
  },
  {
    name: 'ScrollViewExample',
    icon: '📜',
    title: 'useAnimatedScrollHandler',
    component: ScrollViewExample,
  },
  {
    name: 'ScrollToExample',
    icon: '🦘',
    title: 'scrollTo',
    component: ScrollToExample,
  },
  {
    name: 'MeasureExample',
    icon: '📐',
    title: 'measure',
    component: MeasureExample,
  },
  {
    name: 'WorkletExample',
    icon: '🧵',
    title: 'runOnJS / runOnUI',
    component: WorkletExample,
  },
  {
    name: 'TransformExample',
    icon: '🔄',
    title: 'Transform',
    component: TransformExample,
  },
  {
    name: 'WidthExample',
    icon: '🌲',
    title: 'Layout props',
    component: WidthExample,
  },
  {
    name: 'RefExample',
    icon: '🦑',
    title: 'forwardRef & useImperativeHandle',
    component: RefExample,
  },
  {
    name: 'ChessboardExample',
    icon: '♟️',
    title: 'Chessboard',
    component: ChessboardExample,
  },
  {
    name: 'NewestShadowNodesRegistryRemoveExample',
    icon: '🌓',
    title: 'Conditional',
    component: NewestShadowNodesRegistryRemoveExample,
  },
  {
    name: 'EmptyExample',
    icon: '👻',
    title: 'Empty',
    component: EmptyExample,
  },
];

function HomeScreen() {
  const navigation = useNavigation();

  return (
    <FlatList
      style={styles.list}
      data={EXAMPLES}
      ItemSeparatorComponent={ItemSeparator}
      renderItem={({ item }) => (
        <Item
          title={item.icon + '  ' + item.title}
          onPress={() => navigation.navigate(item.name)}
        />
      )}
      renderScrollComponent={(props) => <ScrollView {...props} />}
    />
  );
}

function Item({ title, onPress }) {
  return (
    <RectButton style={styles.button} onPress={onPress}>
      <Text style={styles.title}>{title}</Text>
    </RectButton>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerTitle: 'Reanimated & Fabric examples' }}
          />
          {EXAMPLES.map(({ name, title, component }) => (
            <Stack.Screen
              key={name}
              name={name}
              component={component}
              options={{ headerTitle: title }}
            />
          ))}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    backgroundColor: '#EFEFF4',
  },
  separator: {
    height: 1,
    backgroundColor: '#DBDBE0',
  },
  button: {
    flex: 1,
    height: 60,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 16,
    backgroundColor: 'transparent',
  },
});
