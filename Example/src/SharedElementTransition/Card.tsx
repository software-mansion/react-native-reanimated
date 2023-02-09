import * as React from 'react';
import { Image, Pressable } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { StackScreenProps } from '@react-navigation/stack';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

const photo = require('./assets/image.jpg');
const Stack = createNativeStackNavigator();
const AnimatedImage = Animated.createAnimatedComponent(Image);

function Card({ title, transitionTag, isOpen = false }: any) {
  return (
    <Animated.View
      style={
        isOpen
          ? { height: 500, marginTop: 50, backgroundColor: 'green' }
          : { height: 120, marginTop: 20, backgroundColor: 'green' }
      }
      sharedTransitionTag={transitionTag + '1'}>
      <Animated.Text
        sharedTransitionTag={transitionTag + '2'}
        style={{ width: '100%', height: 20 }}>
        {title}
      </Animated.Text>
      <AnimatedImage
        sharedTransitionTag={transitionTag + '3'}
        source={photo}
        style={{ width: '100%', height: isOpen ? 300 : 100 }}
      />
      {/* <Animated.View
        sharedTransitionTag={transitionTag + "3"}
        style={{ width: '100%', borderWidth: 5, backgroundColor: isOpen ? 'olive' : 'purple', height: isOpen ? 200 : 100 }}
      /> */}
      <Animated.Text
        sharedTransitionTag={transitionTag + '4'}
        style={{ width: '100%', height: isOpen ? 100 : 0 }}>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas aliquid,
        earum non, dignissimos fugit rerum exercitationem ab consequatur, error
        animi veritatis delectus. Nostrum sapiente distinctio possimus vel nam
        facilis ut?
      </Animated.Text>
    </Animated.View>
  );
}

function Screen1({ navigation }: StackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={{ flex: 1 /* marginTop: 200 */ }}>
      {[...Array(6)].map((_, i) => {
        const title = 'Mleko' + i;
        const transitionTag = 'mleko1' + i;

        const goNext = () => {
          navigation.navigate('Screen2', {
            title,
            sharedTransitionTag: transitionTag,
          });
        };
        return (
          <Pressable key={i} onPress={goNext}>
            <Card
              navigation={navigation}
              title={title}
              transitionTag={transitionTag}
              nextScreen="Screen2"
            />
          </Pressable>
        );
      })}
    </Animated.ScrollView>
  );
}

function Screen2({ route, navigation }: StackScreenProps<ParamListBase>) {
  const { title, sharedTransitionTag } = route.params as any;

  const goNext = () => {
    navigation.navigate('Screen1', {
      title,
      sharedTransitionTag,
    });
  };

  const translation = {
    x: useSharedValue(0),
    y: useSharedValue(0),
  };

  const dist = useDerivedValue(() => {
    const xSquared = translation.x.value * translation.x.value;
    const ySquared = translation.y.value * translation.y.value;
    return Math.sqrt(xSquared + ySquared);
  });

  type AnimatedGHContext = {
    startX: number;
    startY: number;
  };
  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    AnimatedGHContext
  >({
    onStart: (_, ctx) => {
      ctx.startX = translation.x.value;
      ctx.startY = translation.y.value;
    },
    onActive: (event, ctx) => {
      translation.x.value = ctx.startX + event.translationX;
      translation.y.value = ctx.startY + event.translationY;
    },
    onEnd: (_) => {
      if (dist.value > 150) {
        runOnJS(goNext)();
      }
      translation.x.value = withSpring(0);
      translation.y.value = withSpring(0);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translation.x.value },
        { translateY: translation.y.value },
        { scale: Math.sqrt(1 - Math.min(0.75, dist.value / 150)) },
      ],
    };
  });

  const containerOpacity = useAnimatedStyle(() => {
    const alpha = Math.max(1 - dist.value / 150, 0);
    return {
      height: '100%',
      backgroundColor: `rgba(255, 255, 255, ${alpha})`,
    };
  });

  return (
    <Animated.View style={containerOpacity} entering={FadeIn.duration(500)}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          <Card
            title={title}
            transitionTag={sharedTransitionTag}
            isOpen={true}
          />
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
}

export function CardExample() {
  return (
    // <NavigationContainer>
    <Stack.Navigator
      screenOptions={{
        // stackAnimation: 'fade_from_bottom',
        // stackAnimation: 'slide_from_right',
        // stackAnimation: 'fade',
        animation: 'none',
        presentation: 'transparentModal',
      }}>
      <Stack.Screen
        name="Screen1"
        component={Screen1}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="Screen2"
        component={Screen2}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
    // </NavigationContainer>
  );
}
