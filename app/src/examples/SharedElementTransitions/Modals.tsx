import * as React from 'react';
import { TouchableNativeFeedback, StyleSheet } from 'react-native';
import { ParamListBase } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

const photo = require('./assets/image.jpg');
const Stack = createNativeStackNavigator();

function Card({
  navigation,
  title,
  transitionTag,
  isOpen = false,
  nextScreen,
}: any) {
  const goNext = (screenName: string) => {
    navigation.navigate(screenName, {
      title: title,
      sharedTransitionTag: transitionTag,
    });
  };

  return (
    <TouchableNativeFeedback
      onPress={() => {
        goNext(nextScreen);
      }}>
      <Animated.View
        style={
          isOpen
            ? { height: 500, marginTop: 50, backgroundColor: 'green' }
            : { height: 120, marginTop: 20, backgroundColor: 'green' }
        }
        sharedTransitionTag={transitionTag + '1'}>
        <Animated.Text
          sharedTransitionTag={transitionTag + '2'}
          style={[styles.fullWidth, { height: 20 }]}>
          {title}
        </Animated.Text>
        <Animated.Image
          sharedTransitionTag={transitionTag + '3'}
          source={photo}
          style={[styles.fullWidth, { height: isOpen ? 300 : 100 }]}
        />
        <Animated.Text
          sharedTransitionTag={transitionTag + '4'}
          style={[styles.fullWidth, { height: isOpen ? 100 : 0 }]}>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas aliquid,
          earum non, dignissimos fugit rerum exercitationem ab consequatur,
          error animi veritatis delectus. Nostrum sapiente distinctio possimus
          vel nam facilis ut?
        </Animated.Text>
      </Animated.View>
    </TouchableNativeFeedback>
  );
}

function Screen1({ navigation }: NativeStackScreenProps<ParamListBase>) {
  return (
    <Animated.ScrollView style={styles.flexOne}>
      {[...Array(6)].map((_, i) => (
        <Card
          key={i}
          navigation={navigation}
          title={'Title' + i}
          transitionTag={'sharedTag' + i}
          nextScreen="Screen2"
        />
      ))}
    </Animated.ScrollView>
  );
}

function Screen2({ route, navigation }: NativeStackScreenProps<ParamListBase>) {
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
      if (Math.abs(translation.x.value) + Math.abs(translation.y.value) > 150) {
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
        {
          scale:
            1 -
            (Math.abs(translation.x.value) + Math.abs(translation.y.value)) /
              500,
        },
      ],
    };
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <Card
          navigation={navigation}
          title={title}
          transitionTag={sharedTransitionTag}
          isOpen={true}
          nextScreen="Screen1"
        />
      </Animated.View>
    </PanGestureHandler>
  );
}

export default function ModalsExample() {
  return (
    <Stack.Navigator
      screenOptions={{
        presentation: 'transparentModal',
        headerShown: false,
      }}>
      <Stack.Screen name="Screen1" component={Screen1} />
      <Stack.Screen name="Screen2" component={Screen2} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
});
