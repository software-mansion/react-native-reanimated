import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useMemo, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';

import { BOTTOM_BAR_HEIGHT } from '@/navigation/constants';
import { colors, flex, radius, sizes, spacing } from '@/theme';

import newYorkImage from './images/new-york.jpg';
import parisImage from './images/paris.jpg';
import tokyoImage from './images/tokyo.jpg';
import veniceImage from './images/venice.jpg';

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const CARDS = [
  {
    description: 'The city of love, where dreams come true',
    image: parisImage,
    title: 'Paris',
  },
  {
    description: 'The floating city surrounded by water',
    image: veniceImage,
    title: 'Venice',
  },
  {
    description: 'The city that never sleeps',
    image: newYorkImage,
    title: 'New York',
  },
  {
    description: 'The city of neon lights and sushi',
    image: tokyoImage,
    title: 'Tokyo',
  },
];

export default function FlexGallery() {
  const [expandedIdx, setExpandedIdx] = useState(0);

  return (
    <View style={styles.container}>
      {CARDS.map(({ description, image, title }, idx) => (
        <GalleryCard
          description={description}
          expanded={idx === expandedIdx}
          image={image}
          key={idx}
          title={title}
          onPress={() => setExpandedIdx(idx)}
        />
      ))}
    </View>
  );
}

type GalleryCardProps = {
  title: string;
  description: string;
  image: ImageSourcePropType;
  expanded: boolean;
  onPress: () => void;
};

function GalleryCard({
  description,
  expanded,
  image,
  onPress,
  title,
}: GalleryCardProps) {
  const gradient = useMemo(
    () => (
      <Svg>
        <Defs>
          <LinearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={colors.black} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.black} stopOpacity="0.75" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#gradient)" height="100%" width="100%" x="0" y="0" />
      </Svg>
    ),
    []
  );

  return (
    <AnimatedTouchableOpacity
      activeOpacity={expanded ? 0.8 : 1}
      style={[
        styles.card,
        {
          flexGrow: expanded ? 100 : 1,
          transitionDuration: 300,
          transitionProperty: 'flexGrow',
          transitionTimingFunction: 'easeInOut',
        },
      ]}
      onPress={onPress}>
      <View style={StyleSheet.absoluteFill}>
        <Image source={image} style={styles.cardImage} />
      </View>
      <Animated.View
        style={[
          styles.cardGradient,
          {
            opacity: expanded ? 1 : 0.75,
            transitionDuration: 300,
            transitionProperty: 'opacity',
          },
        ]}>
        {gradient}
      </Animated.View>
      <View style={styles.cardContentWrapper}>
        <View style={flex.shrink}>
          <Animated.Text
            style={[
              styles.cardTitle,
              {
                fontSize: expanded ? 32 : 20,
                transitionDuration: 300,
                transitionProperty: 'fontSize',
              },
            ]}>
            {title}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.cardDescription,
              {
                maxHeight: expanded ? sizes.lg : 0,
                opacity: expanded ? 1 : 0,
                transitionDuration: 300,
                transitionProperty: 'all',
              },
            ]}>
            {description}
          </Animated.Text>
        </View>
        <Animated.View
          style={{
            transform: [{ rotate: expanded ? '0deg' : '90deg' }],
            transitionDuration: 200,
            transitionProperty: 'transform',
            transitionTimingFunction: cubicBezier(0.5, -0.6, 0.6, 1.5),
          }}>
          <FontAwesomeIcon
            color={colors.white}
            icon={faChevronRight}
            size={20}
          />
        </Animated.View>
      </View>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    justifyContent: 'flex-end',
    minHeight: sizes.lg,
    overflow: 'hidden',
    padding: spacing.md,
  },
  cardContentWrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
  },
  cardDescription: {
    color: '#eee',
    flexShrink: 1,
    fontSize: 14,
  },
  cardGradient: {
    bottom: 0,
    height: sizes.xxxl,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  cardImage: {
    height: '100%',
    objectFit: 'cover',
    width: '100%',
  },
  cardTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    paddingBottom: spacing.xxs,
  },
  container: {
    flex: 1,
    gap: spacing.sm,
    marginBottom: BOTTOM_BAR_HEIGHT + spacing.xl,
    padding: spacing.md,
  },
});
