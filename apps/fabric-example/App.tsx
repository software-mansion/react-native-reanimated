import MaskedView from '@react-native-masked-view/masked-view';
import {
  DarkTheme,
  NavigationContainer,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';
import { LinearGradient, Rect, Stop, Svg } from 'react-native-svg';

type StackParamList = {
  Home: undefined;
  Details: undefined;
};

type AuroraNavigation = NativeStackNavigationProp<StackParamList, 'Home'>;

const Stack = createNativeStackNavigator<StackParamList>();

const fontFamily = 'DM Sans';

function AppTextHover() {
  return (
    <Animated.Text
      style={[
        styles.word,
        {
          fontSize: {
            default: 128,
            ':hover': 192,
          },
          color: {
            default: '#000',
            ':hover': '#EBFCF7',
          },
          shadowColor: {
            default: '#0003',
            ':hover': '#57B495',
          },
          textShadowRadius: {
            default: 5,
            ':hover': 15,
          },
          textShadowOffset: {
            default: { width: 0, height: 0 },
            ':hover': { width: 5, height: 5 },
          },
          paddingHorizontal: 10,
          marginHorizontal: -10,
          shadowOpacity: 1,
          overflow: 'visible',
          transitionDuration: '250ms',
          transitionTimingFunction: 'ease-in-out',
        },
      ]}>
      {'App'.split('').map((char, index) => (
        <Text key={index}>{char}</Text>
      ))}
    </Animated.Text>
  );
}

function AppText() {
  return (
    <Animated.Text
      style={[
        styles.word,
        {
          fontSize: {
            default: 128,
            ':hover': 192,
          },
          shadowColor: '#0003',
          paddingHorizontal: 10,
          marginHorizontal: -10,
          shadowOpacity: 1,
          overflow: 'visible',
          transitionDuration: '250ms',
          transitionTimingFunction: 'ease-in-out',
          animationName: {
            from: {
              textShadowRadius: 5,
              textShadowOffset: { width: 0, height: 0 },
            },
            to: {
              textShadowRadius: 15,
              textShadowOffset: { width: 6, height: 6 },
            },
          },
          animationTimingFunction: 'ease-in-out',
          animationDuration: '1500ms',
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
        },
      ]}>
      {'App'.split('').map((char, index) => (
        <Text key={index}>{char}</Text>
      ))}
    </Animated.Text>
  );
}

function JsTextHover() {
  return (
    <Animated.Text
      style={[
        styles.word,
        {
          fontSize: {
            default: 128,
            ':hover': 192,
          },
          color: {
            default: '#000',
            ':hover': '#EBFCF7',
          },
          shadowColor: {
            default: 'transparent',
            ':hover': '#57B495',
          },
          shadowRadius: {
            default: 5,
            ':hover': 15,
          },
          shadowOffset: {
            default: { width: 0, height: 0 },
            ':hover': { width: 5, height: 5 },
          },
          paddingHorizontal: 10,
          marginHorizontal: -10,
          shadowOpacity: 1,
          overflow: 'visible',
          transitionDuration: '250ms',
          transitionTimingFunction: 'ease-in-out',
        },
      ]}>
      {'js'.split('').map((char, index) => (
        <Text key={index}>{char}</Text>
      ))}
    </Animated.Text>
  );
}

function JsText() {
  return (
    <Animated.Text
      style={[
        styles.word,
        {
          fontSize: {
            default: 128,
            ':hover': 192,
          },
          paddingHorizontal: 10,
          marginHorizontal: -10,
          shadowOpacity: 1,
          overflow: 'visible',
          transitionDuration: '250ms',
          transitionTimingFunction: 'ease-in-out',
          animationName: {
            from: {
              color: '#000',
              shadowColor: 'transparent',
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 0 },
            },
            '70%': {
              color: brandLight,
            },
            to: {
              color: brandLight,
              shadowColor: '#000000',
              shadowRadius: 5,
              shadowOffset: { width: 6, height: 6 },
            },
          },
          animationTimingFunction: 'ease-in-out',
          animationDuration: '1500ms',
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
        },
      ]}>
      {'js'.split('').map((char, index) => (
        <Text key={index}>{char}</Text>
      ))}
    </Animated.Text>
  );
}

function Dot() {
  return <Text style={styles.word}>.</Text>;
}

function Year2026TextHover() {
  return (
    <Animated.Text
      style={{
        textAlign: 'center',
        minWidth: 256,
        minHeight: 48,
        fontSize: {
          default: 1,
          ':hover': 128,
        },
        fontFamily,
        color: {
          default: '#fff0',
          ':hover': '#EBFCF7',
        },
        shadowColor: {
          default: '#fff0',
          ':hover': '#57B495',
        },
        shadowRadius: {
          default: 0,
          ':hover': 5,
        },
        shadowOffset: {
          default: { width: 0, height: 0 },
          ':hover': { width: 2, height: 2 },
        },
        overflow: 'visible',
        shadowOpacity: 1,
        transitionDuration: '250ms',
        transitionTimingFunction: 'ease-in-out',
      }}>
      2026
    </Animated.Text>
  );
}

function Year2026Text() {
  return (
    <Animated.Text
      style={{
        textAlign: 'center',
        minWidth: 256,
        minHeight: 48,
        fontSize: 128,
        fontFamily,
        fontWeight: '600',
        shadowColor: '#0003',
        shadowOpacity: 1,
        overflow: 'visible',
        animationName: {
          from: {
            textShadowRadius: 5,
            textShadowOffset: { width: 0, height: 0 },
          },
          to: {
            textShadowRadius: 15,
            textShadowOffset: { width: 6, height: 6 },
          },
        },
        animationTimingFunction: 'ease-in-out',
        animationDuration: '1500ms',
        animationIterationCount: 'infinite',
        animationDirection: 'alternate',
      }}>
      2026
    </Animated.Text>
  );
}

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

function expandRepeating(
  angle: string,
  pattern: ReadonlyArray<[string, number]>,
  span = 100
): string {
  const startPos = pattern[0][1];
  const cycle = pattern[pattern.length - 1][1] - startPos;
  const stops: string[] = [];
  for (let offset = 0; offset <= span; offset += cycle) {
    for (const [color, p] of pattern) {
      const pos = p - startPos + offset;
      if (pos > span) break;
      stops.push(`${color} ${pos}%`);
    }
  }
  return `linear-gradient(${angle}, ${stops.join(', ')})`;
}

// repeating-linear-gradient(100deg, rgb(0, 0, 0) 0%, rgb(0, 0, 0) 7%, rgba(0, 0, 0, 0) 10%, rgba(0, 0, 0, 0) 12%, rgb(0, 0, 0) 16%), repeating-linear-gradient(100deg, rgb(59, 130, 246) 10%, rgb(165, 180, 252) 15%, rgb(147, 197, 253) 20%, rgb(221, 214, 254) 25%, rgb(96, 165, 250) 30%)

const cssFadeOut = new Keyframe({
  0: { opacity: 1 },
  100: { opacity: 0 },
}).duration(200);

const setFadeIn = new Keyframe({
  0: { opacity: 0 },
  100: { opacity: 1 },
})
  .duration(600)
  .delay(400);

const auroraColors = expandRepeating('100deg', [
  ['rgb(59,130,246)', 10],
  ['rgb(165,180,252)', 14],
  ['rgb(147,197,253)', 18],
  ['rgb(221,214,254)', 22],
  ['rgb(96,165,250)', 26],
  ['rgb(59,130,246)', 30],
]);
const auroraMask = expandRepeating('100deg', [
  ['rgb(0,0,0)', 0],
  ['rgb(0,0,0)', 6],
  ['rgba(0,0,0,0)', 12],
  ['rgb(0,0,0)', 18],
  ['rgb(0,0,0)', 24],
]);
const auroraTextMask = expandRepeating('100deg', [
  ['rgba(255,255,255,0.55)', 0],
  ['rgba(255,255,255,0.55)', 4],
  ['rgb(255,255,255)', 12],
  ['rgba(255,255,255,0.55)', 20],
  ['rgba(255,255,255,0.55)', 24],
]);

//   repeating-linear-gradient(100deg, rgb(0, 0, 0) 0%, rgb(0, 0, 0) 7%, rgba(0, 0, 0, 0) 10%, rgba(0, 0, 0, 0) 12%, rgb(0, 0, 0) 16%), repeating-linear-gradient(100deg, rgb(59, 130, 246) 10%, rgb(165, 180, 252) 15%, rgb(147, 197, 253) 20%, rgb(221, 214, 254) 25%, rgb(96, 165, 250) 30%)

function Aurora() {
  const navigation = useNavigation<AuroraNavigation>();
  const isFocused = useIsFocused();
  return (
    <View style={styles.auroraContainer}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '600%',
          experimental_backgroundImage: auroraColors,
          animationName: {
            from: { transform: [{ translateX: 0 }] },
            to: { transform: [{ translateX: -1200 }] },
          },
          animationTimingFunction: 'linear',
          animationDuration: '36000ms',
          animationIterationCount: 'infinite',
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '600%',
          opacity: 0.5,
          experimental_backgroundImage: auroraMask,
          animationName: {
            from: { transform: [{ translateX: 0 }] },
            to: { transform: [{ translateX: -900 }] },
          },
          animationTimingFunction: 'linear',
          animationDuration: '54000ms',
          animationIterationCount: 'infinite',
        }}
      />
      <Svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: screenWidth,
          height: screenHeight,
        }}>
        <AnimatedGradient
          id="dimGradient"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
          animatedProps={{
            animationName: {
              from: {
                gradient: [
                  { color: 'rgb(0,0,0)', offset: '0%', opacity: 0 },
                  { color: 'rgb(0,0,0)', offset: '75%', opacity: 1 },
                ],
              },
              to: {
                gradient: [
                  { color: 'rgb(0,0,0)', offset: '0%', opacity: 0 },
                  { color: 'rgb(0,0,0)', offset: '80%', opacity: 1 },
                ],
              },
            },
            animationTimingFunction: 'ease-in-out',
            animationDuration: '16000ms',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
          }}>
          <Stop offset="0%" stopColor="rgb(0,0,0)" stopOpacity={0} />
          <Stop offset="100%" stopColor="rgb(0,0,0)" stopOpacity={1} />
        </AnimatedGradient>
        <Rect
          x={0}
          y={0}
          width={screenWidth}
          height={screenHeight}
          fill="url(#dimGradient)"
        />
      </Svg>
      <View style={styles.auroraTitleBottom}>
        <Pressable onPress={() => navigation.navigate('Details')}>
          <Animated.Text
            sharedTransitionTag="reanimated-title"
            style={styles.auroraTitle}>
            Reanimated
          </Animated.Text>
        </Pressable>
        {isFocused && (
          <Animated.View entering={setFadeIn} exiting={cssFadeOut}>
            <MaskedView
              maskElement={
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: '600%',
                    experimental_backgroundImage: auroraTextMask,
                    animationName: {
                      from: { transform: [{ translateX: 0 }] },
                      to: { transform: [{ translateX: -900 }] },
                    },
                    animationTimingFunction: 'linear',
                    animationDuration: '54000ms',
                    animationIterationCount: 'infinite',
                  }}
                />
              }>
              <Animated.Text
                style={[
                  styles.auroraCss,
                  {
                    animationName: {
                      from: { transform: [{ scale: 0.995 }] },
                      to: { transform: [{ scale: 1.005 }] },
                    },
                    animationTimingFunction: 'ease-in-out',
                    animationDuration: '2500ms',
                    animationIterationCount: 'infinite',
                    animationDirection: 'alternate',
                  },
                ]}>
                CSS
              </Animated.Text>
            </MaskedView>
            <View pointerEvents="none" style={styles.auroraTitleDim} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen name="Home" component={Aurora} />
        <Stack.Screen name="Details" component={AuroraDetail} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AuroraDetail() {
  const navigation = useNavigation<AuroraNavigation>();
  const isFocused = useIsFocused();
  return (
    <View style={styles.detailContainer}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '600%',
          experimental_backgroundImage: auroraColors,
          animationName: {
            from: { transform: [{ translateX: 0 }] },
            to: { transform: [{ translateX: -1200 }] },
          },
          animationTimingFunction: 'linear',
          animationDuration: '36000ms',
          animationIterationCount: 'infinite',
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '600%',
          opacity: 0.5,
          experimental_backgroundImage: auroraMask,
          animationName: {
            from: { transform: [{ translateX: 0 }] },
            to: { transform: [{ translateX: -900 }] },
          },
          animationTimingFunction: 'linear',
          animationDuration: '54000ms',
          animationIterationCount: 'infinite',
        }}
      />
      <View pointerEvents="none" style={styles.detailDim} />
      <Pressable onPress={() => navigation.goBack()}>
        <Animated.Text
          sharedTransitionTag="reanimated-title"
          style={styles.auroraTitle}>
          Reanimated
        </Animated.Text>
      </Pressable>
      {isFocused && (
        <Animated.View entering={setFadeIn} exiting={cssFadeOut}>
          <View>
            <MaskedView
              maskElement={
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: '600%',
                    experimental_backgroundImage: auroraTextMask,
                    animationName: {
                      from: { transform: [{ translateX: 0 }] },
                      to: { transform: [{ translateX: -900 }] },
                    },
                    animationTimingFunction: 'linear',
                    animationDuration: '54000ms',
                    animationIterationCount: 'infinite',
                  }}
                />
              }>
              <Text style={styles.detailSet}>SET</Text>
            </MaskedView>
            <View pointerEvents="none" style={styles.auroraSetDim} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function Pill() {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.backgroundCircle,
          {
            animationName: {
              from: { boxShadow: '0px 0px 5px 2px #000' },
              to: { boxShadow: '6px 6px 16px 4px #000' },
            },
            animationTimingFunction: 'ease-in-out',
            animationDuration: '1500ms',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
          },
        ]}>
        <Svg
          style={{
            position: 'absolute',
            width: 1000,
            height: 600,
            top: 0,
            left: 0,
            overflow: 'hidden',
          }}>
          <AnimatedGradient
            id="gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="50%"
            animatedProps={{
              animationName: {
                from: {
                  gradient: [
                    { color: brandDark, offset: '0%', opacity: 1 },
                    { color: brandLight, offset: '20%', opacity: 1 },
                    { color: brandLight, offset: '25%', opacity: 1 },
                    { color: brandBlue, offset: '100%', opacity: 1 },
                  ],
                },
                to: {
                  gradient: [
                    { color: brandDark, offset: '0%', opacity: 1 },
                    { color: brandLight, offset: '35%', opacity: 1 },
                    { color: brandLight, offset: '50%', opacity: 1 },
                    { color: brandBlue, offset: '100%', opacity: 1 },
                  ],
                },
              },
              animationTimingFunction: 'ease-in-out',
              animationDuration: '1500ms',
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
            }}>
            <Stop offset="0%" stopColor={brandDark} />
            <Stop offset="50%" stopColor={brandBlue} />
            <Stop offset="70%" stopColor={brandLight} />
          </AnimatedGradient>
          <Rect x={0} y={0} width={1000} height={600} fill="url(#gradient)" />
        </Svg>
        <View style={styles.column}>
          <View style={styles.row}>
            <AppText />
            <Dot />
            <JsText />
          </View>
          <Year2026Text />
        </View>
      </Animated.View>
    </View>
  );
}

const brandDark = '#001A72';
const brandBlue = '#38ACDD';
const brandLight = '#E1F3FA';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  word: {
    fontSize: 128,
    fontWeight: '700',
    fontFamily,
  },
  backgroundCircle: {
    borderRadius: 9999,
    padding: 40,
    shadowColor: '#000',
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    overflow: 'hidden',
    boxShadow: '0px 0px 5px 2px #000',
  },
  auroraContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  auroraTitleBottom: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  auroraTitle: {
    textAlign: 'center',
    color: '#fff',
    fontFamily,
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: 1,
  },
  auroraCss: {
    textAlign: 'center',
    color: '#fff',
    fontFamily,
    fontSize: 110,
    fontWeight: '900',
    letterSpacing: 6,
  },
  auroraTitleDim: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)',
  },
  auroraSetDim: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    experimental_backgroundImage:
      'linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)',
  },
  detailContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailDim: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    experimental_backgroundImage:
      'linear-gradient(0deg, rgba(0,0,0,0) 0%, rgb(0,0,0) 45%)',
  },
  detailSet: {
    marginTop: 8,
    color: '#fff',
    fontFamily,
    fontSize: 128,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
});
