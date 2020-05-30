import React, { useState, useRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnUI,
  useAnimatedGestureHandler,
  interpolate,
  Extrapolate,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Dimensions, StyleSheet, View, Image } from 'react-native';
import {
  ScrollView,
  PanGestureHandler,
  TouchableWithoutFeedback,
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
  const ref = useRef();
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

  return (
    <TouchableWithoutFeedback
      style={containerStyle}
      onPress={() => onPress(ref, item, opacity)}>
      <AnimatedImage ref={ref} source={{ uri: item.uri }} style={styles} />
    </TouchableWithoutFeedback>
  );
}

function useSharedVector(x, y) {
  return {
    x: useSharedValue(x),
    y: useSharedValue(y),
  };
}

const timingConfig = {
  duration: 350,
  easing: Easing.bezier(0.33, 0.01, 0, 1),
};

function ImageTransition({ activeImage, onClose }) {
  const animationProgress = useSharedValue(0);

  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(1);

  const {
    x,
    item,
    width,
    height,
    targetWidth,
    targetHeight,
    sv: imageOpacity,
  } = activeImage;

  const y = activeImage.y - Header.HEIGHT;

  const target = useSharedVector(
    0,
    (dimensions.height - targetHeight) / 2 - Header.HEIGHT
  );

  const translate = useSharedVector(0, 0);

  const onPan = useAnimatedGestureHandler({
    onActive: event => {
      translate.x.value = event.translationX;
      translate.y.value = event.translationY;

      scale.value = interpolate(
        translate.y.value,
        [-200, 0, 200],
        [0.65, 1, 0.65],
        Extrapolate.CLAMP
      );

      backdropOpacity.value = interpolate(
        translate.y.value,
        [-100, 0, 100],
        [0, 1, 0],
        Extrapolate.CLAMP
      );
    },

    onEnd: (event, ctx) => {
      if (Math.abs(translate.y.value) > 40) {
        target.x.value = translate.x.value - target.x.value * -1;
        target.y.value = translate.y.value - target.y.value * -1;

        translate.x.value = 0;
        translate.y.value = 0;

        animationProgress.value = withTiming(0, timingConfig, () => {
          imageOpacity.value = 1;
          onClose();
        });

        backdropOpacity.value = withTiming(0, timingConfig);
      } else {
        backdropOpacity.value = withTiming(1, timingConfig);
        translate.x.value = withTiming(0, timingConfig);
        translate.y.value = withTiming(0, timingConfig);
      }

      scale.value = withTiming(1, timingConfig);
    },
  });

  const imageStyles = useAnimatedStyle(() => {
    const interpolateProgress = range =>
      interpolate(animationProgress.value, [0, 1], range, Extrapolate.CLAMP);

    const translateY =
      translate.y.value + interpolateProgress([y, target.y.value]);
    const translateX =
      translate.x.value + interpolateProgress([x, target.x.value]);

    return {
      position: 'absolute',
      top: translateY,
      left: translateX,
      width: interpolateProgress([width, targetWidth]),
      height: interpolateProgress([height, targetHeight]),
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

  runOnUI(() => {
    'worklet';

    animationProgress.value = withTiming(1, timingConfig, () => {
      imageOpacity.value = 0;
    });
    backdropOpacity.value = withTiming(1, timingConfig);
  })();

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Animated.View style={[styles.backdrop, backdropStyles]} />

      <PanGestureHandler onGestureEvent={onPan}>
        <Animated.View style={StyleSheet.absoluteFillObject}>
          <AnimatedImage source={{ uri: item.uri }} style={imageStyles} />
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

  function onItemPress(imageRef, item, sv) {
    imageRef.current.getNode().measure((x, y, width, height, pageX, pageY) => {
      if (width === 0 && height === 0) {
        return;
      }

      const targetWidth = dimensions.width;
      const scaleFactor = item.width / targetWidth;
      const targetHeight = item.height / scaleFactor;

      setActiveImage({
        item,
        width,
        height,
        x: pageX,
        y: pageY,
        targetHeight,
        targetWidth,
        sv,
      });
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
