import React from 'react';
import { View, StyleSheet, Dimensions, Image, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedRef,
  scrollTo,
  useAnimatedGestureHandler,
  Extrapolate,
  interpolate,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

let data = [
  { artist: 'Nirvana', song: 'Smells Like Teen Spirit' },
  { artist: 'John Lennon', song: 'Imagine' },
  { artist: 'U2', song: 'One' },
  { artist: 'Michael Jackson', song: 'Billie Jean' },
  { artist: 'Queen', song: 'Bohemian Rhapsody' },
  { artist: 'The Beatles', song: 'Hey Jude' },
  { artist: 'Bob Dylan', song: 'Like A Rolling Stone' },
  { artist: 'Rolling Stones', song: "I Can't Get No Satisfaction" },
  { artist: 'Sex Pistols', song: 'God Save The Queen' },
  { artist: "Guns N' Roses", song: "Sweet Child O'Mine" },
  { artist: 'The Clash', song: 'London Calling' },
  { artist: 'The Kinks', song: 'Waterloo Sunset' },
  { artist: 'The Eagles', song: 'Hotel California' },
  { artist: 'Elton John', song: 'Your Song' },
  { artist: 'Led Zeppelin', song: 'Stairway To Heaven' },
  { artist: 'Chubby Checker', song: 'The Twist' },
  { artist: 'Oasis', song: 'Live Forever' },
  { artist: 'Whitney Houston', song: 'I Will Always Love You' },
  { artist: 'David Bowie', song: 'Life On Mars?' },
  { artist: 'Elvis Presley', song: 'Heartbreak Hotel' },
  { artist: 'Judy Garland', song: 'Over The Rainbow' },
  { artist: 'Marvin Gaye', song: "What's Goin' On" },
  { artist: 'Bruce Springsteen', song: 'Born To Run' },
  { artist: 'The Ronettes', song: 'Be My Baby' },
  { artist: 'Radiohead', song: 'Creep' },
  { artist: 'Simon & Garfunkel', song: 'Bridge Over Troubled Water' },
  { artist: 'Aretha Franklin', song: 'Respect' },
  { artist: 'Sly And The Family Stone', song: 'Family Affair' },
  { artist: 'ABBA', song: 'Dancing Queen' },
  { artist: 'The Beach Boys', song: 'Good Vibrations' },
  { artist: 'Jimi Hendrix', song: 'Purple Haze' },
  { artist: 'The Beatles', song: 'Yesterday' },
  { artist: 'Chuck Berry', song: 'Jonny B Good' },
  { artist: 'Bob Marley', song: 'No Woman No Cry' },
  { artist: 'Jeff Buckley', song: 'Hallelujah' },
  { artist: 'The Police', song: 'Every Breath You Take' },
  { artist: 'The Beatles', song: 'A Day In The Life' },
  { artist: 'Ben E King', song: 'Stand By Me' },
  { artist: 'James Brown', song: "Papa's Got A Brand New Bag" },
  { artist: 'The Rolling Stones', song: 'Gimme Shelter' },
  { artist: 'Ray Charles', song: "What'd I Say" },
  { artist: 'Dire Straits', song: 'Sultans Of Swing' },
  { artist: 'The Beach Boys', song: 'God Only Knows' },
  { artist: 'The Righteous Brothers', song: "You've Lost That Lovin' Feeling" },
  { artist: 'The Who', song: 'My Generation' },
  { artist: 'Martha Reeves and the Vandellas', song: 'Dancing In The Street' },
  { artist: 'Prince', song: 'When Doves Cry' },
  { artist: 'Sam Cooke', song: 'A Change Is Gonna Come' },
  { artist: 'Ike and Tina Turner', song: 'River Deep Mountain High' },
  { artist: 'The Emotions', song: 'Best Of My Love' },
];

data = data.slice(0, 10);

const ITEM_SIZE = {
  size: 250,
  margin: 70,
};
const SCROLL_MARGIN = 20;
const IPOD_MARGIN = 20;
const SCREEN_WIDTH =
  Dimensions.get('window').width - IPOD_MARGIN * 2 - SCROLL_MARGIN * 2;
const BIG_BALL_SIZE = 200;
const BIG_BALL_MARGIN = 0;
const SMALL_BALL_SIZE = 50;
const INNER_BALL_SIZE =
  BIG_BALL_SIZE - SMALL_BALL_SIZE * 2 - BIG_BALL_MARGIN * 2;
const DEFAULT_COVER_URI =
  'https://e7.pngegg.com/pngimages/950/513/png-clipart-eighth-note-musical-note-stem-notes-music-download-graphic-arts.png';

function ScrollExample() {
  const position = useSharedValue(0);
  const animatedRef = useAnimatedRef();

  const itemTotalSize = ITEM_SIZE.size + ITEM_SIZE.margin * 2;
  const borderMargin = SCREEN_WIDTH / 2 - itemTotalSize / 2 + ITEM_SIZE.margin;

  const scrollToNearestItem = (offset) => {
    'worklet';
    let minDistance;
    let minDistanceIndex = 0;
    for (let i = 0; i < data.length; ++i) {
      const distance = Math.abs(i * itemTotalSize - offset);
      if (minDistance === undefined) {
        minDistance = distance;
      } else {
        if (distance < minDistance) {
          minDistance = distance;
          minDistanceIndex = i;
        }
      }
    }

    scrollTo(animatedRef, minDistanceIndex * itemTotalSize, 0, true);
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e, ctx) => {
      position.value = e.contentOffset.x;
    },
    onEndDrag: (e, ctx) => {
      scrollToNearestItem(e.contentOffset.x);
    },
    onMomentumEnd: (e, ctx) => {
      scrollToNearestItem(e.contentOffset.x);
    },
  });

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (e, ctx) => {
      ctx.start = { x: e.x, y: e.y };
      ctx.last = ctx.start;
    },
    onActive: (e, ctx) => {
      const currentPoz = { x: e.x, y: e.y };
      const lastPoz = ctx.last;
      ctx.last = currentPoz;
      if (currentPoz.x === lastPoz.x && lastPoz.y === currentPoz.y) {
        // no change so far
        return;
      }
      const changeVector = {
        x: currentPoz.x - lastPoz.x,
        y: currentPoz.y - lastPoz.y,
      };
      const toCenterV = {
        x: BIG_BALL_SIZE / 2 - lastPoz.x,
        y: BIG_BALL_SIZE / 2 - lastPoz.y,
      };
      const crossProd =
        changeVector.x * toCenterV.y - changeVector.y * toCenterV.x;
      if (crossProd === 0) {
        return;
      }
      const dist = Math.sqrt(changeVector.x ** 2 + changeVector.y ** 2);
      // up or down
      const sign = crossProd < 0 ? -1 : 1;
      const arr = [0, itemTotalSize * (data.length - 1)];
      position.value = interpolate(
        position.value + sign * dist * 5,
        arr,
        arr,
        Extrapolate.CLAMP
      );
      scrollTo(animatedRef, position.value, 0, false);
    },
    onEnd: (e, ctx) => {
      scrollToNearestItem(position.value);
    },
  });

  return (
    <View style={styles.ipod}>
      <Animated.ScrollView
        ref={animatedRef}
        horizontal={true}
        style={styles.scroll}
        scrollEventThrottle={1}
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}>
        {data.map(({ artist, song }, i) => {
          const uas = useAnimatedStyle(() => {
            const style = {};
            const itemDistance =
              Math.abs(position.value - i * itemTotalSize) / itemTotalSize;
            let opacity = 1;
            if (itemDistance >= 0.5) {
              opacity = 0.3;
            } else if (itemDistance > 3) {
              opacity = 0;
            }
            style.opacity = opacity;
            if (i === 0) {
              style.marginLeft = borderMargin;
            } else if (i === data.length - 1) {
              style.marginRight = borderMargin;
            }
            return style;
          });
          return (
            <Animated.View key={i} style={[styles.item, uas]}>
              <Image
                style={styles.cover}
                source={{
                  uri: DEFAULT_COVER_URI,
                }}
              />
              <Text style={styles.label}>{artist}</Text>
              <Text style={[styles.label, styles.songLabel]}>{song}</Text>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={styles.ballWrapper}>
          <View style={styles.innerBall} />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  ipod: {
    backgroundColor: '#D3D3D3',
    margin: 20,
    borderRadius: 20,
  },
  scroll: {
    borderRadius: 20,
    backgroundColor: '#87CEEB',
    margin: SCROLL_MARGIN,
  },
  item: {
    width: ITEM_SIZE.size,
    height: ITEM_SIZE.size,
    margin: ITEM_SIZE.margin,
    backgroundColor: 'orange',
  },
  ballWrapper: {
    borderWidth: BIG_BALL_MARGIN,
    borderRadius: BIG_BALL_SIZE,
    width: BIG_BALL_SIZE,
    height: BIG_BALL_SIZE,
    marginLeft: SCREEN_WIDTH / 2 - BIG_BALL_SIZE / 2 + SCROLL_MARGIN,
    marginTop: 40,
    marginBottom: 40,
    backgroundColor: 'white',
  },
  ball: {
    width: SMALL_BALL_SIZE,
    height: SMALL_BALL_SIZE,
    backgroundColor: 'orange',
    borderRadius: SMALL_BALL_SIZE,
    position: 'absolute',
  },
  innerBall: {
    position: 'absolute',
    width: INNER_BALL_SIZE,
    height: INNER_BALL_SIZE,
    borderRadius: INNER_BALL_SIZE,
    top: SMALL_BALL_SIZE,
    left: SMALL_BALL_SIZE,
    backgroundColor: '#D3D3D3',
  },
  label: {
    fontSize: 15,
    width: ITEM_SIZE.size,
    textAlign: 'center',
  },
  songLabel: {
    fontSize: 20,
  },
  cover: {
    width: 100,
    height: 100,
    backgroundColor: 'white',
    margin: 20,
    marginLeft: ITEM_SIZE.size / 2 - 100 / 2,
  },
});

export default ScrollExample;
