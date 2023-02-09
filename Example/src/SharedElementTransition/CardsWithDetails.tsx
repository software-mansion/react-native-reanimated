import * as React from 'react';
import Animated, {
  Layout,
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

const Stack = createNativeStackNavigator();

const Card: React.FC<{
  text: string;
}> = ({ text }) => {
  const { height, width } = useWindowDimensions();
  const [expanded, setExpanded] = React.useState(false);

  const collapse = () => setExpanded(false);

  const translation = {
    x: useSharedValue(0),
    y: useSharedValue(0),
  };

  const dist = useDerivedValue(() => {
    const xSquared = translation.x.value * translation.x.value;
    const ySquared = translation.y.value * translation.y.value;
    return Math.sqrt(xSquared + ySquared);
  });

  const expandedStyle: ViewStyle = {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    minWidth: width,
    minHeight: height,
    backgroundColor: 'green',
    borderWidth: 2,
    borderColor: 'black',
    zIndex: 1,
    justifyContent: 'center',
  };

  const borderRadius = 16;

  const dragStyle = useAnimatedStyle(() => {
    const scale = 1 - Math.min(0.5, dist.value / 200);
    return {
      transform: [
        { translateX: translation.x.value },
        { translateY: translation.y.value },
        { scale },
      ],
      borderRadius: (2 * (1 - scale) * borderRadius) / scale,
    };
  });

  const collapsedStyle: ViewStyle = {
    height: 200,
    width: 125,
    margin: 24,
    backgroundColor: 'green',
    borderWidth: 2,
    borderColor: 'black',
    borderRadius: borderRadius,
    transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
    justifyContent: 'center',
  };

  type AnimatedGHContext = {
    startX: number;
    startY: number;
  };
  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    AnimatedGHContext
  >(
    {
      onStart: (_, ctx) => {
        console.log('onStart');
        ctx.startX = translation.x.value;
        ctx.startY = translation.y.value;
      },
      onActive: (event, ctx) => {
        console.log('onActive');
        translation.x.value = ctx.startX + event.translationX;
        translation.y.value = ctx.startY + event.translationY;
      },
      onEnd: (_) => {
        translation.x.value = 0;
        translation.y.value = 0;
        if (dist.value > 100) {
          runOnJS(collapse)();
        }
      },
    },
    [collapse]
  );

  return (
    <>
      {expanded && (
        <Animated.View style={[collapsedStyle, { opacity: 0 }]}></Animated.View>
      )}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View
          onTouchEnd={() => setExpanded(true)}
          style={expanded ? [expandedStyle, dragStyle] : collapsedStyle}
          layout={Layout}>
          <Text style={{ textAlign: 'center' }}>{text}</Text>
        </Animated.View>
      </PanGestureHandler>
    </>
  );
};

const Screen = () => {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: 'blue',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-evenly',
        paddingTop: 64,
      }}>
      <Card text="Bla1" />
      <Card text="Bla2" />
      <Card text="Bla3" />
      <Card text="Bla4" />
    </View>
  );
};

export function CardsWithDetailsExample() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Screen"
        component={Screen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
