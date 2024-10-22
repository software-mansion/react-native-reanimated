import { useMemo, useState } from 'react';
import { BOTTOM_BAR_HEIGHT } from '../../../../navigation/constants';
import { colors, flex, radius, sizes, spacing } from '../../../../theme';
import type { ImageSourcePropType } from 'react-native';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const CARDS = [
  {
    title: 'Paris',
    description: 'The city of love, where dreams come true',
    image: require('./images/paris.jpg'),
  },
  {
    title: 'Venice',
    description: 'The floating city surrounded by water',
    image: require('./images/venice.jpg'),
  },
  {
    title: 'New York',
    description: 'The city that never sleeps',
    image: require('./images/new-york.jpg'),
  },
  {
    title: 'Tokyo',
    description: 'The city of neon lights and sushi',
    image: require('./images/tokyo.jpg'),
  },
];

export default function FlexGallery() {
  const [expandedIdx, setExpandedIdx] = useState(0);

  return (
    <View style={styles.container}>
      {CARDS.map(({ title, description, image }, idx) => (
        <GalleryCard
          key={idx}
          title={title}
          description={description}
          expanded={idx === expandedIdx}
          image={image}
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
  expanded,
  onPress,
  title,
  image,
  description,
}: GalleryCardProps) {
  const gradient = useMemo(
    () => (
      <Svg>
        <Defs>
          <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.black} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.black} stopOpacity="0.75" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gradient)" />
      </Svg>
    ),
    []
  );

  return (
    <AnimatedTouchableOpacity
      activeOpacity={expanded ? 0.8 : 1}
      onPress={onPress}
      style={[
        styles.card,
        {
          transitionProperty: 'flexGrow',
          transitionDuration: 300,
          transitionTimingFunction: 'easeInOut',
          flexGrow: expanded ? 100 : 1,
        },
      ]}>
      <View style={StyleSheet.absoluteFill}>
        <Image style={styles.cardImage} source={image} />
      </View>
      <Animated.View
        style={[
          styles.cardGradient,
          {
            transitionProperty: 'opacity',
            transitionDuration: 300,
            opacity: expanded ? 1 : 0.75,
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
                transitionProperty: 'fontSize',
                transitionDuration: 300,
                fontSize: expanded ? 32 : 20,
              },
            ]}>
            {title}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.cardDescription,
              {
                transitionProperty: 'all',
                transitionDuration: 300,
                maxHeight: expanded ? sizes.lg : 0,
                opacity: expanded ? 1 : 0,
              },
            ]}>
            {description}
          </Animated.Text>
        </View>
        <Animated.View
          style={{
            transitionProperty: 'transform',
            transitionDuration: 200,
            transitionTimingFunction: cubicBezier(0.5, -0.6, 0.6, 1.5),
            transform: [{ rotate: expanded ? '0deg' : '90deg' }],
          }}>
          <FontAwesomeIcon
            icon={faChevronRight}
            color={colors.white}
            size={20}
          />
        </Animated.View>
      </View>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: BOTTOM_BAR_HEIGHT + spacing.xl,
  },
  card: {
    borderRadius: radius.md,
    minHeight: sizes.lg,
    justifyContent: 'flex-end',
    padding: spacing.md,
    overflow: 'hidden',
  },
  cardContentWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    paddingBottom: spacing.xxs,
  },
  cardDescription: {
    fontSize: 14,
    color: '#eee',
    flexShrink: 1,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: sizes.xxxl,
  },
});
