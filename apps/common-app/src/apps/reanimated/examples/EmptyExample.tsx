import { StyleSheet, Text, View } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';
import { Circle, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';

import { Screen } from '@/apps/css/components';

const fontFamily = 'DM Sans';

function App() {
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
      {'App'.split('').map((char, index) => (
        <Text key={index}>{char}</Text>
      ))}
    </Animated.Text>
  );
}

function Js() {
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
            ':hover': '#57B495',
          },
          shadowColor: {
            default: 'transparent',
            ':hover': '#B1DFD0',
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

function Dot() {
  return <Text style={styles.word}>.</Text>;
}

function Year2026() {
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

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export default function Hover() {
  return (
    <Screen>
      <View style={styles.container}>
        <View style={[styles.backgroundCircle, { overflow: 'hidden' }]}>
          <Svg
            // width="100%"
            // height
            style={{
              position: 'absolute',
              width: 1000,
              height: 600,
              top: 0,
              left: 0,
              overflow: 'hidden',
              backgroundColor: 'yellow',
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
                      { color: brandLight, offset: '30%', opacity: 1 },
                      { color: brandBlue, offset: '100%', opacity: 1 },
                    ],
                  },
                  to: {
                    gradient: [
                      { color: brandDark, offset: '0%', opacity: 1 },
                      { color: brandLight, offset: '35%', opacity: 1 },
                      { color: brandLight, offset: '60%', opacity: 1 },
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
              <App />
              <Dot />
              <Js />
            </View>
            <Year2026 />
          </View>
        </View>
      </View>
    </Screen>
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
    experimental_backgroundImage: `linear-gradient(30deg, ${brandDark}, ${brandBlue}, ${brandLight} 70%)`,
  },
});
