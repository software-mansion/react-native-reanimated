import React, { useState, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  interpolate,
  Extrapolate,
  withTiming,
  Easing,
  useAnimatedRef,
  measure,
} from 'react-native-reanimated';
import {
  Dimensions,
  StyleSheet,
  View,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import {
  ScrollView,
  PanGestureHandler,
  TapGestureHandler,
} from 'react-native-gesture-handler';
import { Header } from 'react-navigation-stack';

const AnimatedImage = Animated.createAnimatedComponent(Image);

const dimensions = Dimensions.get('window');
const GUTTER_WIDTH = 3;
const NUMBER_OF_IMAGES = 4;
const IMAGE_SIZE =
  (dimensions.width - GUTTER_WIDTH * (NUMBER_OF_IMAGES - 1)) / NUMBER_OF_IMAGES;

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
    height:
      Platform.OS === 'web' ? dimensions.height - Header.HEIGHT : undefined,
  },

  scrollContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
});

function ImageList({ images, onItemPress }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {images.map((item, i) => (
        <ListItem onPress={onItemPress} key={i} index={i} item={item} />
      ))}
    </ScrollView>
  );
}

function ListItem({ item, index, onPress }) {
  const ref = useAnimatedRef();
  const opacity = useSharedValue(1);

  const containerStyle = {
    marginRight: (index + 1) % 4 === 0 ? 0 : GUTTER_WIDTH,
    marginBottom: GUTTER_WIDTH,
  };

  const styles = useAnimatedStyle(() => {
    return {
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      opacity: opacity.value,
    };
  });

  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  function handlePress() {
    onPress(ref, item, { imageOpacity: opacity, width, height, x, y });
  }

  const handler = useAnimatedGestureHandler({
    onFinish: (evt, ctx, isCanceledOrFailed) => {
      if (isCanceledOrFailed) {
        return;
      }

      // measure the image
      // width/height and position to animate from it to the full screen one
      const measurements = measure(ref);

      width.value = measurements.width;
      height.value = measurements.height;
      x.value = measurements.pageX;
      y.value = measurements.pageY - HEADER_HEIGHT;

      handlePress();
    },
  });

  return (
    <TapGestureHandler onGestureEvent={handler}>
      <Animated.View style={containerStyle}>
        <AnimatedImage ref={ref} source={{ uri: item.uri }} style={styles} />
      </Animated.View>
    </TapGestureHandler>
  );
}

const timingConfig = {
  duration: 240,
  easing: Easing.bezier(0.33, 0.01, 0, 1),
};

const HEADER_HEIGHT = Header.HEIGHT - StatusBar.currentHeight;

function ImageTransition({ activeImage, onClose }) {
  const { item, x, y, width, height, imageOpacity } = activeImage;
  const { uri } = item;

  const targetWidth = dimensions.width;
  const scaleFactor = item.width / targetWidth;
  const targetHeight = item.height / scaleFactor;

  const animationProgress = useSharedValue(0);

  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(1);

  const targetX = useSharedValue(0);
  const targetY = useSharedValue(
    (dimensions.height - targetHeight) / 2 - HEADER_HEIGHT
  );

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const onPan = useAnimatedGestureHandler({
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      scale.value = interpolate(
        translateY.value,
        [-200, 0, 200],
        [0.65, 1, 0.65],
        Extrapolate.CLAMP
      );

      backdropOpacity.value = interpolate(
        translateY.value,
        [-100, 0, 100],
        [0, 1, 0],
        Extrapolate.CLAMP
      );
    },

    onEnd: (event, ctx) => {
      if (Math.abs(translateY.value) > 40) {
        targetX.value = translateX.value - targetX.value * -1;
        targetY.value = translateY.value - targetY.value * -1;

        translateX.value = 0;
        translateY.value = 0;

        animationProgress.value = withTiming(0, timingConfig, () => {
          imageOpacity.value = withTiming(
            1,
            {
              duration: 16,
            },
            onClose
          );
        });

        backdropOpacity.value = withTiming(0, timingConfig);
      } else {
        backdropOpacity.value = withTiming(1, timingConfig);
        translateX.value = withTiming(0, timingConfig);
        translateY.value = withTiming(0, timingConfig);
      }

      scale.value = withTiming(1, timingConfig);
    },
  });

  const imageStyles = useAnimatedStyle(() => {
    const interpolateProgress = (range) =>
      interpolate(animationProgress.value, [0, 1], range, Extrapolate.CLAMP);

    const top =
      translateY.value + interpolateProgress([y.value, targetY.value]);
    const left =
      translateX.value + interpolateProgress([x.value, targetX.value]);

    return {
      position: 'absolute',
      top,
      left,
      width: interpolateProgress([width.value, targetWidth]),
      height: interpolateProgress([height.value, targetHeight]),
      transform: [
        {
          scale: scale.value,
        },
      ],
    };
  });

  const backdropStyles = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
    };
  });

  useEffect(() => {
    // fixes flickering
    requestAnimationFrame(() => {
      imageOpacity.value = 0;
    });

    animationProgress.value = withTiming(1, timingConfig);
    backdropOpacity.value = withTiming(1, timingConfig);
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Animated.View style={[styles.backdrop, backdropStyles]} />

      <PanGestureHandler onGestureEvent={onPan}>
        <Animated.View style={StyleSheet.absoluteFillObject}>
          <AnimatedImage source={{ uri }} style={imageStyles} />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const images = Array.from({ length: 30 }, (_, index) => {
  return {
    uri: `https://picsum.photos/id/${index + 10}/400/400`,
    width: dimensions.width,
    height: 400,
  };
});

export default function LightboxExample() {
  const [activeImage, setActiveImage] = useState(null);

  function onItemPress(animatedRef, item, svs) {
    setActiveImage({
      animatedRef,
      item,
      ...svs,
    });
  }

  function onClose() {
    setActiveImage(null);
  }

  return (
    <View style={styles.container}>
      <ImageList onItemPress={onItemPress} images={images} />

      {activeImage && (
        <ImageTransition onClose={onClose} activeImage={activeImage} />
      )}
    </View>
  );
}
