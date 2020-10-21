import React from 'react';
import { Dimensions, Image } from 'react-native';
import {
  GalleryItemType,
  normalizeDimensions,
  Pager,
} from '../../libt';

const { height, width } = Dimensions.get('window');

const pages: GalleryItemType[] = [
  {
    id: '1',
    width: 400,
    height: 300,
    uri: 'https://placekitten.com/400/300',
  },
  {
    id: '2',
    width: 400,
    height: 300,
    uri: 'https://placekitten.com/400/300',
  },
  {
    id: '3',
    width: 400,
    height: 300,
    uri: 'https://placekitten.com/400/300',
  },
];

export default function PagerBasicExampleScreen() {
  return (
    <Pager
      pages={pages}
      totalCount={pages.length}
      keyExtractor={(item) => item.id}
      initialIndex={0}
      gutterWidth={20}
      renderPage={(props) => {
        const { targetWidth, targetHeight } = normalizeDimensions(
          props.item,
        );

        return (
          <Image
            style={{ width: targetWidth, height: targetHeight }}
            source={{ uri: props.item.uri }}
          />
        );
      }}
    />
  );
}
