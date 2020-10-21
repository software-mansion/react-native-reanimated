import { Dimensions } from 'react-native';
const dimensions = Dimensions.get('window');

function getRandomIntInclusive(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const heights = [300, 400, 500, 540, 580, 600];

const GUTTER_WIDTH = 3;
const NUMBER_OF_IMAGES = 4;
const IMAGE_SIZE =
  (dimensions.width - GUTTER_WIDTH * (NUMBER_OF_IMAGES - 1)) /
  NUMBER_OF_IMAGES;

export function generateImageList(
  length: number,
  countFrom: number = 10,
  height?: number,
) {
  const images = Array.from({ length }, (_, index) => {
    const heightToUse =
      height ?? heights[getRandomIntInclusive(0, heights.length - 1)];

    return {
      id: index.toString(),
      uri: `https://picsum.photos/id/${index +
        countFrom}/400/${heightToUse}`,
      width: 400,
      height: heightToUse,
    };
  });

  return {
    images,
    getContainerStyle: (index: number) => ({
      marginRight: (index + 1) % 4 === 0 ? 0 : GUTTER_WIDTH,
      marginBottom: GUTTER_WIDTH,
    }),
    IMAGE_SIZE,
  };
}
