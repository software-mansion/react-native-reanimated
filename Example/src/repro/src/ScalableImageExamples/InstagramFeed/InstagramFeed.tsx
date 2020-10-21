import React, { useCallback, useMemo, useRef } from 'react';
import {
  Dimensions,
  View,
  Text,
  StatusBar,
  FlatList,
  Image,
  FlatListProps,
} from 'react-native';
import {
  GalleryItemType,
  ScalableImage,
  Pager,
  RenderPageProps,
  normalizeDimensions,
} from '../../../libt';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  Extrapolate,
  interpolate,
  withTiming,
  delay,
} from 'react-native-reanimated';
import { ScrollView } from 'react-native-gesture-handler';
import { DetachedHeader } from '../../DetachedHeader';
import { useControls } from '../../hooks/useControls';
import { generateImageList } from '../../utils/generateImageList';
import { getConstants } from '../../utils/getConstants';
import s from './styles';

const { width } = Dimensions.get('window');

const heart = require('../../../../../assets/Heart.svg');
const bubble = require('../../../../../assets/Bubble.svg');
const airplane = require('../../../../../assets/Airplane.svg');
const bookmark = require('../../../../../assets/Bookmark.svg');

interface ListItemT {
  id: string;
  name: string;
  images: GalleryItemType[];
}

const data: ListItemT[] = [
  {
    id: '1',
    name: 'spock',
    images: generateImageList(1, 256, 300).images,
  },
  {
    id: '2',
    name: 'kirk',
    images: generateImageList(6, 180, 400).images,
  },
  {
    id: '3',
    name: 'leonard',
    images: generateImageList(4, 50, 350).images,
  },
  {
    id: '4',
    name: 'james',
    images: generateImageList(1, 20, 250).images,
  },
  {
    id: '5',
    name: 'hikaru',
    images: generateImageList(5, 213, 400).images,
  },
  {
    id: '6',
    name: 'scotty',
    images: generateImageList(5, 14, 450).images,
  },
];

const Header = ({ uri, name }) => (
  <View style={s.itemHeader}>
    <Image source={{ uri }} style={s.image} />
    <Text style={s.itemText}>{name}</Text>
  </View>
);
const Footer = () => (
  <View style={s.footerItem}>
    <View style={s.row}>
      <Image source={heart} style={s.icon} />
      <Image source={bubble} style={s.icon} />
      <Image source={airplane} style={s.icon} />
    </View>
    <Image source={bookmark} style={s.iconBookmark} />
  </View>
);

const Pagination = ({ length, activeIndexInPager }) => {
  const dots = Array.from({ length: length }, (_, i) => {
    const animatedDotStyle = useAnimatedStyle(() => {
      const color =
        activeIndexInPager.value === i ? '#178EED' : '#A7A7A7';
      const size = activeIndexInPager.value === i ? 6 : 4.5;

      return {
        backgroundColor: color,
        width: size,
        height: size,
        borderRadius: 3,
        marginHorizontal: 1.5,
      };
    }, []);

    return (
      <Animated.View style={animatedDotStyle} key={i}></Animated.View>
    );
  });

  return <View style={[s.paginationContainer]}>{dots}</View>;
};

interface RenderItemProps {
  index: number;
  activeItemIndex: Animated.SharedValue<number>;
  item: ListItemT;
  setControlsHidden: (shouldHide: boolean) => void;
  scrollViewRef: React.Ref<ScrollView>;
}

function RenderItem({
  index: _index,
  activeItemIndex,
  item: { images, name },
  setControlsHidden,
  scrollViewRef,
}: RenderItemProps) {
  const opacity = useSharedValue(0);
  const backgroundScale = useSharedValue(0);
  const activeIndexInPager = useSharedValue(0);

  const normalizedImages = useMemo(
    () =>
      images.map((item) => {
        const { targetWidth, targetHeight } = normalizeDimensions(
          item,
        );

        return {
          ...item,
          width: targetWidth,
          height: targetHeight,
        };
      }),
    [images],
  );

  const onScale = useCallback((scale: number) => {
    'worklet';

    opacity.value = interpolate(
      scale,
      [1, 2],
      [0, 0.7],
      Extrapolate.CLAMP,
    );

    backgroundScale.value = interpolate(
      scale,
      [1, 1.01, 2],
      [0, 4, 5],
      Extrapolate.CLAMP,
    );
  }, []);

  const onGestureStart = useCallback(() => {
    'worklet';

    setControlsHidden(true);
    StatusBar.setHidden(true);
    activeItemIndex.value = _index;
  }, []);

  const onGestureRelease = useCallback(() => {
    'worklet';

    //delay for smooth hiding background opacity
    activeItemIndex.value = delay(200, withTiming(-1));
    setControlsHidden(false);
    StatusBar.setHidden(false);
  }, []);

  const overlayStyles = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        {
          scale: backgroundScale.value,
        },
      ],
    };
  });

  const keyExtractor = useCallback(
    ({ id }: { id: string }) => id,
    [],
  );

  const canvasHeight = useMemo(
    () => Math.max(...normalizedImages.map((item) => item.height)),
    [normalizedImages],
  );

  function RenderPage({
    item,
    pagerRefs,
  }: RenderPageProps<GalleryItemType>) {
    return (
      <ScalableImage
        outerGestureHandlerRefs={[...pagerRefs, scrollViewRef]}
        source={item.uri}
        width={item.width}
        height={item.height}
        onScale={onScale}
        onGestureStart={onGestureStart}
        onGestureRelease={onGestureRelease}
      />
    );
  }

  function onIndexChangeWorklet(nextIndex: number) {
    'worklet';

    activeIndexInPager.value = nextIndex;
  }

  const content = (() => {
    if (images.length === 1) {
      return (
        <ScalableImage
          source={images[0].uri}
          width={images[0].width}
          height={images[0].height}
          onScale={onScale}
          outerGestureHandlerRefs={[scrollViewRef]}
          onGestureStart={onGestureStart}
          onGestureRelease={onGestureRelease}
        />
      );
    } else {
      return (
        <>
          <Pager
            pages={images}
            totalCount={images.length}
            keyExtractor={keyExtractor}
            initialIndex={0}
            width={width}
            gutterWidth={0}
            outerGestureHandlerRefs={[scrollViewRef]}
            verticallyEnabled={false}
            renderPage={RenderPage}
            onIndexChange={onIndexChangeWorklet}
          />

          <Pagination
            length={images.length}
            activeIndexInPager={activeIndexInPager}
          />
        </>
      );
    }
  })();

  return (
    <Animated.View style={s.itemContainer}>
      <Header uri={images[0].uri} name={name} />

      <Animated.View
        pointerEvents="none"
        style={[s.overlay, overlayStyles]}
      />

      <View style={[s.itemPager, { height: canvasHeight }]}>
        {content}
      </View>

      <Footer />
    </Animated.View>
  );
}

export default function InstagramFeed() {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const activeItemIndex = useSharedValue(-1);

  const { controlsStyles, setControlsHidden } = useControls();

  const { APPBAR_HEIGHT, STATUSBAR_HEIGHT } = getConstants();

  const CellRendererComponent = useMemo<
    FlatListProps<ListItemT>['CellRendererComponent']
  >(
    () => ({ children, index, style, ...props }) => {
      const animatedStyles = useAnimatedStyle(() => {
        const isActive =
          activeItemIndex.value !== -1 &&
          activeItemIndex.value === index;

        return {
          zIndex: isActive ? 1 : 0,
        };
      });
      return (
        <Animated.View {...props} style={animatedStyles}>
          {children}
        </Animated.View>
      );
    },
    [],
  );

  return (
    <>
      <FlatList
        contentContainerStyle={{
          paddingTop: APPBAR_HEIGHT + STATUSBAR_HEIGHT,
        }}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        data={data}
        keyExtractor={({ id }) => id}
        renderItem={(item) => (
          <RenderItem
            {...item}
            scrollViewRef={scrollViewRef}
            activeItemIndex={activeItemIndex}
            setControlsHidden={setControlsHidden}
          />
        )}
        renderScrollComponent={(props) => (
          // @ts-ignore
          <ScrollView {...props} ref={scrollViewRef} />
        )}
        CellRendererComponent={CellRendererComponent}
      />

      <Animated.View style={controlsStyles}>
        <DetachedHeader.Container>
          <DetachedHeader />
        </DetachedHeader.Container>
      </Animated.View>
    </>
  );
}
