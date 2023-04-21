import React from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  // SharedTransition,
  useAnimatedStyle,
  useSharedValue,
  // withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  View,
  FlatList,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  NativeStackNavigationProp,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native-gesture-handler';

// const springOptions = {
//   damping: 15,
// };

// const lightboxTransition = SharedTransition.custom((values) => {
//   'worklet';
//   return {
//     width: withSpring(values.targetWidth, springOptions),
//     height: withSpring(values.targetHeight, springOptions),
//     originX: withSpring(values.targetOriginX, springOptions),
//     originY: withSpring(values.targetOriginY, springOptions),
//   };
// });

type ExampleImage = {
  id: number;
  uri: string;
  width: number;
  height: number;
};

type StackParamList = {
  CameraRoll: undefined;
  Lightbox: { item: ExampleImage };
};

const dimensions = Dimensions.get('window');

const images: ExampleImage[] = Array.from({ length: 30 }, (_, index) => {
  return {
    id: index + 1,
    uri: `https://picsum.photos/id/${index + 10}/400/400`,
    width: dimensions.width,
    height: 400,
  };
});

function CameraRollScreen(): React.ReactElement {
  const nav =
    useNavigation<NativeStackNavigationProp<StackParamList, 'CameraRoll'>>();

  return (
    <View style={[cameraRollStyles.container]}>
      <FlatList
        contentContainerStyle={cameraRollStyles.scrollContainer}
        data={images}
        numColumns={4}
        columnWrapperStyle={cameraRollStyles.column}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => nav.navigate('Lightbox', { item })}>
            <Animated.Image
              // sharedTransitionStyle={lightboxTransition}
              sharedTransitionTag={'image-' + item.id}
              source={{ uri: item.uri }}
              style={cameraRollStyles.image}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const cameraRollStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    gap: 4,
    justifyContent: 'center',
  },
  column: {
    gap: 4,
  },
  image: {
    width: dimensions.width / 4 - 3,
    height: dimensions.width / 4 - 3,
  },
});

function LightboxScreen() {
  const nav =
    useNavigation<NativeStackNavigationProp<StackParamList, 'Lightbox'>>();
  const route = useRoute<RouteProp<StackParamList, 'Lightbox'>>();

  const activeItem = route.params.item;

  const goBack = () => {
    nav.goBack();
  };

  const translation = {
    x: useSharedValue(0),
    y: useSharedValue(0),
    scale: useSharedValue(1),
  };

  const panGeture = Gesture.Pan()
    .onChange((event) => {
      translation.x.value += event.changeX;
      translation.y.value += event.changeY;
    })
    .onEnd(() => {
      if (Math.abs(translation.x.value) + Math.abs(translation.y.value) > 150) {
        runOnJS(goBack)();
      } else {
        translation.x.value = withTiming(0);
        translation.y.value = withTiming(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translation.x.value },
      { translateY: translation.y.value },
      {
        scale:
          1 -
          (Math.abs(translation.x.value) + Math.abs(translation.y.value)) /
            1000,
      },
    ],
  }));

  const opacityAnimatedStyle = useAnimatedStyle(() => ({
    opacity:
      1 - (Math.abs(translation.x.value) + Math.abs(translation.y.value)) / 100,
  }));

  return (
    <View style={[styles.container]}>
      <Animated.View
        entering={FadeIn.duration(200)}
        style={[StyleSheet.absoluteFill, opacityAnimatedStyle]}>
        <Pressable style={styles.backdrop} onPress={goBack} />
      </Animated.View>

      <GestureDetector gesture={panGeture}>
        <Animated.View style={[animatedStyle, styles.imageContainer]}>
          <Animated.Image
            // sharedTransitionStyle={lightboxTransition}
            source={{ uri: activeItem.uri }}
            style={{
              width: activeItem.width,
              height: activeItem.height,
            }}
            sharedTransitionTag={'image-' + activeItem.id}
          />
        </Animated.View>
      </GestureDetector>

      <Animated.Text
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.backButton}
        onPress={goBack}>
        Back
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 44,
    left: 10,
    fontSize: 16,
    color: 'white',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
});

const Stack = createNativeStackNavigator<StackParamList>();

export function CameraRollExample() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CameraRoll" component={CameraRollScreen} />
      <Stack.Screen
        name="Lightbox"
        options={{
          headerShown: false,
          animation: 'none',
          presentation: 'transparentModal',
        }}
        component={LightboxScreen}
      />
    </Stack.Navigator>
  );
}
