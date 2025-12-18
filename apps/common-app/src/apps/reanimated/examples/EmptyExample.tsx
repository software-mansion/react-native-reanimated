import {
  NavigationContainer,
  NavigationIndependentTree,
  useNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  Pressable,
} from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollOffset,
  useSharedValue,
} from 'react-native-reanimated';

type RootStackParamList = {
  First: undefined;
  Second: { index: number };
};

type FirstScreenProp = NativeStackNavigationProp<RootStackParamList, 'First'>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const Stack = createNativeStackNavigator<RootStackParamList>();
const N = 100;

interface ItemProps {
  index: number;
  offset: SharedValue<number>;
  amplitude: SharedValue<number>;
  onPress: () => void;
}

function Album({ index }: { index: number }) {
  const id = index + 50;

  return (
    <Animated.View style={styles.album} sharedTransitionTag={String(index)}>
      <Image
        style={styles.backgroundImage}
        source={{ uri: `https://picsum.photos/id/${id}/300/300?blur=10` }}
      />
      <Image
        source={{ uri: `https://picsum.photos/id/${id}/60/60` }}
        style={styles.image}
      />
      <View style={styles.column}>
        <Text style={[styles.text, styles.bold]}>Item {index + 1}</Text>
        <Text style={styles.text}>Lorem ipsum</Text>
      </View>
    </Animated.View>
  );
}

function Item({ index, offset, amplitude, onPress }: ItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const y = index * 50 - offset.value + 200;
    const x = Math.sin(y * 0.012) * amplitude.value;
    const rotation = Math.atan(-Math.cos(y * 0.012) * 0.012 * amplitude.value);

    const currentIndex = offset.value / 50;
    const scale = interpolate(
      index,
      [currentIndex - 10, currentIndex, currentIndex + 10],
      [0.2, 1, 0.2],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateY: y },
        { translateX: x },
        { rotate: `${rotation}rad` },
        { scale },
      ],
    };
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      sharedTransitionTag={String(index)}
      style={[styles.pressable, { zIndex: -index }, animatedStyle]}>
      <Album index={index} />
    </AnimatedPressable>
  );
}

function FirstScreen() {
  const navigation = useNavigation<FirstScreenProp>();

  const scrollViewRef = useAnimatedRef<ScrollView>();

  const offset = useScrollOffset(scrollViewRef);

  const amplitude = useSharedValue(25);

  const pinch = Gesture.Pinch().onChange((e) => {
    amplitude.value *= e.scaleChange;
  });

  const native = Gesture.Native();

  const gesture = Gesture.Simultaneous(pinch, native);

  return (
    <View style={styles.container}>
      {Array.from({ length: N }).map((_, index) => (
        <Item
          key={index}
          index={index}
          offset={offset}
          amplitude={amplitude}
          onPress={() => {
            console.log(index);
            navigation.navigate('Second', { index });
          }}
        />
      ))}
      <GestureDetector gesture={gesture}>
        <ScrollView ref={scrollViewRef} style={styles.scrollView}>
          <View style={styles.spacer} />
        </ScrollView>
      </GestureDetector>
    </View>
  );
}

function SecondScreen({ route }: { route: { params: { index: number } } }) {
  const index = route.params.index;

  return (
    <View style={styles.container}>
      <Album index={index} />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView>
      <NavigationIndependentTree>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="First" component={FirstScreen} />
            <Stack.Screen name="Second" component={SecondScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </NavigationIndependentTree>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    zIndex: 0,
  },
  scrollView: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
  spacer: {
    height: N * 50,
  },
  pressable: {
    position: 'absolute',
    top: 0,
    width: 300,
    height: 80,
  },
  album: {
    width: 300,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    flexDirection: 'row',
    paddingLeft: 10,
    overflow: 'hidden',
    backgroundColor: 'black',
  },
  backgroundImage: {
    width: 300,
    height: 300,
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.7,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  text: {
    color: 'white',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bold: {
    fontWeight: 600,
  },
  column: {
    marginLeft: 10,
    flexDirection: 'column',
  },
});
