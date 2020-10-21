import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { GalleryItemType, ScalableImage } from '../../libt';
import Animated, {
  Extrapolate,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { DetachedHeader } from '../DetachedHeader';
import {
  normalizeDimensions,
  useSharedValue,
} from '../../libt/utils';
import { useControls } from '../hooks/useControls';

const image: GalleryItemType = {
  id: '4',
  width: 250,
  height: 250,
  uri: 'https://placekitten.com/250/250',
};

export default function StandaloneGalleryBasicScreen() {
  const { controlsStyles, setControlsHidden } = useControls();

  const opacity = useSharedValue(0);

  const overlayStyles = useAnimatedStyle(() => ({
    opacity: opacity.value,
    backgroundColor: 'black',
  }));

  const onScale = useCallback((scale: number) => {
    'worklet';

    opacity.value = interpolate(
      scale,
      [1, 2],
      [0, 0.3],
      Extrapolate.CLAMP,
    );
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, overlayStyles]}
      />

      <View
        style={{
          zIndex: 0,
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <ScalableImage
          width={image.width}
          height={image.height}
          source={image.uri}
          onScale={onScale}
          onGestureStart={() => {
            setControlsHidden(true);
            StatusBar.setHidden(true);
          }}
          onGestureRelease={() => {
            setControlsHidden(false);
            StatusBar.setHidden(false);
          }}
        />
      </View>

      <Animated.View style={controlsStyles}>
        <DetachedHeader.Container>
          <DetachedHeader />
        </DetachedHeader.Container>
      </Animated.View>
    </View>
  );
}
