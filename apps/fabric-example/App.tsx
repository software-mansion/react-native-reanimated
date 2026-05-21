import MaskedView from '@react-native-masked-view/masked-view';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createContext, useContext, useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';
import { LinearGradient, Rect, Stop, Svg } from 'react-native-svg';

type ThemeMode = 'dark' | 'light';

type Palette = {
  bg: string;
  text: string;
  setShadow: string;
  navTheme: typeof DarkTheme;
  auroraColors: [string, string, string, string, string];
  dimColor: string;
  dimColorAlpha0: string;
  dimColorAlpha60: string;
  toggleLabel: string;
  toggleBg: string;
  toggleText: string;
};

const PALETTES: Record<ThemeMode, Palette> = {
  dark: {
    bg: '#000000',
    text: '#ffffff',
    setShadow: 'rgba(0,0,0,0.85)',
    navTheme: DarkTheme,
    auroraColors: [
      'rgb(59,130,246)',
      'rgb(165,180,252)',
      'rgb(147,197,253)',
      'rgb(221,214,254)',
      'rgb(96,165,250)',
    ],
    dimColor: 'rgb(0,0,0)',
    dimColorAlpha0: 'rgba(0,0,0,0)',
    dimColorAlpha60: 'rgba(0,0,0,0.6)',
    toggleLabel: '☀',
    toggleBg: 'rgba(255,255,255,0.12)',
    toggleText: '#ffffff',
  },
  light: {
    bg: '#fff5ee',
    text: '#1a1a2e',
    setShadow: 'rgba(255,255,255,0.85)',
    navTheme: DefaultTheme,
    auroraColors: [
      'rgb(244,114,182)',
      'rgb(251,146,178)',
      'rgb(254,205,170)',
      'rgb(253,224,181)',
      'rgb(248,180,150)',
    ],
    dimColor: 'rgb(255,245,238)',
    dimColorAlpha0: 'rgba(255,245,238,0)',
    dimColorAlpha60: 'rgba(255,245,238,0.6)',
    toggleLabel: '☾',
    toggleBg: 'rgba(0,0,0,0.08)',
    toggleText: '#1a1a2e',
  },
};

const ThemeContext = createContext<{
  mode: ThemeMode;
  palette: Palette;
  toggle: () => void;
}>({
  mode: 'dark',
  palette: PALETTES.dark,
  toggle: () => {},
});

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

function makeAuroraColors(palette: Palette): string {
  const [a, b, c, d, e] = palette.auroraColors;
  return expandRepeating('100deg', [
    [a, 10],
    [b, 14],
    [c, 18],
    [d, 22],
    [e, 26],
    [a, 30],
  ]);
}

const DARK_AURORA_COLORS = makeAuroraColorsRaw(PALETTES.dark);
const LIGHT_AURORA_COLORS = makeAuroraColorsRaw(PALETTES.light);
const DARK_AURORA_MASK = makeAuroraMaskRaw(PALETTES.dark);
const LIGHT_AURORA_MASK = makeAuroraMaskRaw(PALETTES.light);

function makeAuroraColorsRaw(palette: Palette): string {
  const [a, b, c, d, e] = palette.auroraColors;
  return expandRepeating('100deg', [
    [a, 10],
    [b, 14],
    [c, 18],
    [d, 22],
    [e, 26],
    [a, 30],
  ]);
}

function makeAuroraMaskRaw(palette: Palette): string {
  return expandRepeating('100deg', [
    [palette.dimColor, 0],
    [palette.dimColor, 6],
    [palette.dimColorAlpha0, 12],
    [palette.dimColor, 18],
    [palette.dimColor, 24],
  ]);
}

function AuroraColorLayer({
  gradient,
  visible,
}: {
  gradient: string;
  visible: boolean;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: '600%',
        opacity: visible ? 1 : 0,
        transitionProperty: 'opacity',
        transitionDuration: '1500ms',
        transitionTimingFunction: 'ease-in-out',
        experimental_backgroundImage: gradient,
        animationName: {
          from: { transform: [{ translateX: 0 }] },
          to: { transform: [{ translateX: -1200 }] },
        },
        animationTimingFunction: 'linear',
        animationDuration: '36000ms',
        animationIterationCount: 'infinite',
      }}
    />
  );
}

function AuroraMaskLayer({
  gradient,
  visible,
}: {
  gradient: string;
  visible: boolean;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: '600%',
        opacity: visible ? 0.5 : 0,
        transitionProperty: 'opacity',
        transitionDuration: '1500ms',
        transitionTimingFunction: 'ease-in-out',
        experimental_backgroundImage: gradient,
        animationName: {
          from: { transform: [{ translateX: 0 }] },
          to: { transform: [{ translateX: -900 }] },
        },
        animationTimingFunction: 'linear',
        animationDuration: '54000ms',
        animationIterationCount: 'infinite',
      }}
    />
  );
}

function makeAuroraMask(palette: Palette): string {
  return expandRepeating('100deg', [
    [palette.dimColor, 0],
    [palette.dimColor, 6],
    [palette.dimColorAlpha0, 12],
    [palette.dimColor, 18],
    [palette.dimColor, 24],
  ]);
}
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
  const { mode, palette, toggle } = useContext(ThemeContext);
  return (
    <Animated.View
      style={[
        styles.auroraContainer,
        {
          backgroundColor: palette.bg,
          transitionProperty: 'backgroundColor',
          transitionDuration: '1500ms',
          transitionTimingFunction: 'ease-in-out',
        },
      ]}>
      <AuroraColorLayer gradient={DARK_AURORA_COLORS} visible={mode === 'dark'} />
      <AuroraColorLayer gradient={LIGHT_AURORA_COLORS} visible={mode === 'light'} />
      <AuroraMaskLayer gradient={DARK_AURORA_MASK} visible={mode === 'dark'} />
      <AuroraMaskLayer gradient={LIGHT_AURORA_MASK} visible={mode === 'light'} />
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
                  { color: palette.dimColor, offset: '0%', opacity: 0 },
                  { color: palette.dimColor, offset: '75%', opacity: 1 },
                ],
              },
              to: {
                gradient: [
                  { color: palette.dimColor, offset: '0%', opacity: 0 },
                  { color: palette.dimColor, offset: '80%', opacity: 1 },
                ],
              },
            },
            animationTimingFunction: 'ease-in-out',
            animationDuration: '16000ms',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
          }}>
          <Stop offset="0%" stopColor={palette.dimColor} stopOpacity={0} />
          <Stop offset="100%" stopColor={palette.dimColor} stopOpacity={1} />
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
            style={[
              styles.auroraTitle,
              {
                color: palette.text,
                transitionProperty: 'color',
                transitionDuration: '1500ms',
                transitionTimingFunction: 'ease-in-out',
              },
            ]}>
            Reanimated
          </Animated.Text>
        </Pressable>
        {isFocused && (
          <Animated.View entering={setFadeIn} exiting={cssFadeOut}>
            <Pressable onPress={toggle}>
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
                      color: palette.text,
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
            </Pressable>
            <View
              pointerEvents="none"
              style={[
                styles.auroraTitleDim,
                {
                  experimental_backgroundImage: `linear-gradient(180deg, ${palette.dimColorAlpha0} 0%, ${palette.dimColorAlpha0} 40%, ${palette.dimColorAlpha60} 100%)`,
                },
              ]}
            />
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

export default function App() {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const palette = PALETTES[mode];
  const contextValue = useMemo(
    () => ({
      mode,
      palette,
      toggle: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')),
    }),
    [mode, palette]
  );
  return (
    <ThemeContext.Provider value={contextValue}>
      <NavigationContainer theme={palette.navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={Aurora} />
          <Stack.Screen name="Details" component={AuroraDetail} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeContext.Provider>
  );
}

function AuroraDetail() {
  const navigation = useNavigation<AuroraNavigation>();
  const isFocused = useIsFocused();
  const { mode, palette, toggle } = useContext(ThemeContext);
  return (
    <Animated.View
      style={[
        styles.detailContainer,
        {
          backgroundColor: palette.bg,
          transitionProperty: 'backgroundColor',
          transitionDuration: '1500ms',
          transitionTimingFunction: 'ease-in-out',
        },
      ]}>
      <AuroraColorLayer gradient={DARK_AURORA_COLORS} visible={mode === 'dark'} />
      <AuroraColorLayer gradient={LIGHT_AURORA_COLORS} visible={mode === 'light'} />
      <AuroraMaskLayer gradient={DARK_AURORA_MASK} visible={mode === 'dark'} />
      <AuroraMaskLayer gradient={LIGHT_AURORA_MASK} visible={mode === 'light'} />
      <View
        pointerEvents="none"
        style={[
          styles.detailDim,
          {
            experimental_backgroundImage: `linear-gradient(0deg, ${palette.dimColorAlpha0} 0%, ${palette.dimColor} 45%)`,
          },
        ]}
      />
      <Pressable onPress={() => navigation.goBack()}>
        <Animated.Text
          sharedTransitionTag="reanimated-title"
          style={[
            styles.auroraTitle,
            {
              color: palette.text,
              transitionProperty: 'color',
              transitionDuration: '1500ms',
              transitionTimingFunction: 'ease-in-out',
            },
          ]}>
          Reanimated
        </Animated.Text>
      </Pressable>
      {isFocused && (
        <Animated.View entering={setFadeIn} exiting={cssFadeOut}>
          <Pressable onPress={toggle}>
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
                  styles.detailSet,
                  {
                    color: palette.text,
                    textShadowColor: palette.setShadow,
                  },
                ]}>
                SET
              </Animated.Text>
            </MaskedView>
            <View
              pointerEvents="none"
              style={[
                styles.auroraSetDim,
                {
                  experimental_backgroundImage: `linear-gradient(0deg, ${palette.dimColorAlpha0} 0%, ${palette.dimColorAlpha0} 40%, ${palette.dimColorAlpha60} 100%)`,
                },
              ]}
            />
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
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
