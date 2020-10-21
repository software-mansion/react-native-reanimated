import React from 'react';
import { Dimensions, StyleSheet, Image } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native-gesture-handler';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  useGalleryInit,
  useGalleryItem,
  GalleryOverlay,
  GalleryProvider,
} from 'react-native-gallery-toolkit';

const dimensions = Dimensions.get('window');

const ImageComponent = Animated.createAnimatedComponent(Image);

function getRandomIntInclusive(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const heights = [300, 400, 500, 540, 580, 600];

const images = Array.from({ length: 5 }, (_, index) => {
  const height =
    heights[getRandomIntInclusive(0, heights.length - 1)];

  return {
    uri: `https://picsum.photos/id/${index + 200}/${height}/400`,
    width: height,
    height: dimensions.width,
  };
});

const GUTTER_WIDTH = 3;
const NUMBER_OF_IMAGES = 4;
const IMAGE_SIZE =
  (dimensions.width - GUTTER_WIDTH * (NUMBER_OF_IMAGES - 1)) /
  NUMBER_OF_IMAGES;

const styles = StyleSheet.create({
  scrollContainer: {
    paddingTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

function ImageList({ images, onItemPress }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {images.map((item, i) => (
        <ListItem
          onPress={onItemPress}
          key={i}
          index={i}
          item={item}
        />
      ))}
    </ScrollView>
  );
}

function ListItem({ item, index }) {
  const { ref, onPress, opacity } = useGalleryItem({
    index,
    item,
  });

  const containerStyle = {
    marginRight: (index + 1) % 4 === 0 ? 0 : GUTTER_WIDTH,
    marginBottom: GUTTER_WIDTH,
  };

  const imageStyles = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  }, []);

  return (
    <TouchableWithoutFeedback
      style={containerStyle}
      onPress={onPress}
    >
      <ImageComponent
        ref={ref}
        source={{ uri: item.uri }}
        style={[
          { width: IMAGE_SIZE, height: IMAGE_SIZE },
          imageStyles,
        ]}
      />
    </TouchableWithoutFeedback>
  );
}

export default function ImageGalleryScreen() {
  useGalleryInit();

  return (
    <GalleryOverlay>
      <GalleryProvider totalCount={images.length}>
        <ImageList images={images} />
      </GalleryProvider>
    </GalleryOverlay>
  );
}
