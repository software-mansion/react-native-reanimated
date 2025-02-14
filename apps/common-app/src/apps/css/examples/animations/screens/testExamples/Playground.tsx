/**
 * This example is meant to be used for temporary purposes only. Code in this
 * file should be replaced with the actual example implementation.
 */

import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { createAnimatedComponent, css } from 'react-native-reanimated';

import { Screen } from '@/apps/css/components';
import { flex } from '@/theme';

const AnimatedView = createAnimatedComponent(View);

const jump = css.keyframes({
  from: {
    transform: [{ translateY: 0 }],
  },
  to: {
    transform: [{ translateY: 100 }],
  },
});

const color = css.keyframes({
  from: {
    backgroundColor: 'red',
  },
  to: {
    backgroundColor: 'blue',
  },
});

export default function Playground() {
  const [c, setC] = useState(0);

  useEffect(() => {
    const int = setInterval(() => {
      setC(c + 1);
    }, 1);
    return () => clearInterval(int);
  }, [c]);

  return (
    <Screen style={flex.center}>
      <Text>Hello world!</Text>
      <AnimatedView
        style={[
          styles.parent,
          {
            animationDirection: 'alternate',
            animationDuration: 500,
            animationIterationCount: 'infinite',
            animationName: css.keyframes({
              // --------- Swoosh to the RIGHT -----------
              '0%': {
                transform: 'translate(0,0) scale(1,1)',
              },
              '1%': {
                transform: 'translate(0,0) scale(1,1)',
              },
              '4%': {
                transform: 'translate(140px,0) scale(8,1)',
              },
              '5%': {
                transform: 'translate(280px,0) scale(1,1)',
              },
              '6%': {
                transform: 'translate(290px,0) scale(0.5,2)',
              },
              '8%': {
                transform: 'translate(275px,0) scale(1.25,0.9)',
              },
              '10%': {
                transform: 'translate(280px,0) scale(1,1)',
              },

              // ------- Beam DOWN --------
              '19%': {
                transform: 'translate(280px,140px) scale(0.4,8)',
              },
              '21%': {
                transform: 'translate(280px,140px) scale(0.4,8)',
              },
              '22%': {
                transform: 'translate(280px,280px) scale(1,1)',
              },

              // --------- STEPS to the LEFT -----------
              '24%': {
                transform: 'translate(280px,280px)',
              },
              '25%': {
                transform: 'translate(260px,272px) scale(1,1) rotate(-45deg)',
              },
              '27%': {
                transform: 'translate(240px,280px) scale(1,1) rotate(-90deg)',
              },
              '27.1%': {
                transform:
                  'translate(240px,286px) scale(1.3,0.7) rotate(-90deg)',
              },
              '29%': {
                transform: 'translate(240px,280px) scale(1,1) rotate(-90deg)',
              },

              '33%': {
                transform: 'translate(220px,272px) scale(1,1) rotate(-135deg)',
              },
              '35%': {
                transform: 'translate(200px,280px) scale(1,1) rotate(-180deg)',
              },
              '35.1%': {
                transform:
                  'translate(200px,286px) scale(1.3,0.7) rotate(-180deg)',
              },
              '38%': {
                transform: 'translate(200px,280px) scale(1,1) rotate(-180deg)',
              },

              '42%': {
                transform: 'translate(180px,272px) scale(1,1) rotate(-225deg)',
              },
              '44%': {
                transform: 'translate(160px,280px) scale(1,1) rotate(-270deg)',
              },
              '44.1%': {
                transform:
                  'translate(160px,286px) scale(1.3,0.7) rotate(-270deg)',
              },
              '46%': {
                transform: 'translate(160px,280px) scale(1,1) rotate(-270deg)',
              },

              '49%': {
                transform: 'translate(140px,272px) scale(1,1) rotate(-315deg)',
              },
              '51%': {
                transform: 'translate(120px,280px) scale(1,1) rotate(-360deg)',
              },
              '51.1%': {
                transform:
                  'translate(120px,286px) scale(1.3,0.7) rotate(-360deg)',
              },
              '53%': {
                transform: 'translate(120px,280px) scale(1,1) rotate(-360deg)',
              },

              '56%': {
                transform: 'translate(100px,272px) scale(1,1) rotate(-405deg)',
              },
              '58%': {
                transform: 'translate(80px,280px) scale(1,1) rotate(-450deg)',
              },
              '58.1%': {
                transform:
                  'translate(80px,286px) scale(1.3,0.7) rotate(-450deg)',
              },
              '60%': {
                transform: 'translate(80px,280px) scale(1,1) rotate(-450deg)',
              },

              '63%': {
                transform: 'translate(60px,272px) scale(1,1) rotate(-495deg)',
              },
              '65%': {
                transform: 'translate(40px,280px) scale(1,1) rotate(-540deg)',
              },
              '65.1%': {
                transform:
                  'translate(40px,286px) scale(1.3,0.7) rotate(-540deg)',
              },
              '67%': {
                transform: 'translate(40px,280px) scale(1,1) rotate(-540deg)',
              },

              '70%': {
                transform: 'translate(20px,272px) scale(1,1) rotate(-585deg)',
              },
              '73%': {
                transform: 'translate(0,280px) scale(1,1) rotate(-630deg)',
              },
              '73.0001%': {
                transform: 'translate(0,280px) rotate(0deg)',
              },

              // -------- RACE to the TOP ---------
              '75%': {
                transform: 'translate(0,280px) scale(1,1) skew(0,0)',
              },
              '80%': {
                transform: 'translate(0,270px) scale(1,1) skew(0,1deg)',
              },
              '85%': {
                transform: 'translate(0,0) scale(1,1) skew(0,30deg)',
              },
              '85.1%': {
                transform: 'translate(0,0) scale(1,1) skew(0,0)',
              },
              '86%': {
                transform: 'translate(0,-16px) scale(1.9,0.3) skew(0,0)',
              },
              '90%': {
                transform: 'translate(0,2px) scale(0.9,1.1) skew(0,0)',
              },
              '95%': {
                transform: 'translate(0,0) scale(1,1)',
              },
            }),
          },
        ]}
      />
    </Screen>
  );
}

const styles = css.create({
  child: {
    animationDirection: ['normal', 'alternate'],
    animationDuration: '10s',
    animationIterationCount: 'infinite',
    animationName: [
      css.keyframes({
        0.1: {
          width: '75%',
        },
        0.2: {
          width: 20,
        },
        0.3: {
          width: '50%',
        },
        0.4: {
          width: 20,
        },
        0.5: {
          width: '75%',
        },
        0.6: {
          width: 0,
        },
        0.7: {
          width: '100%',
        },
        0.8: {
          width: '25%',
        },
        0.9: {
          width: '75%',
        },
        from: {
          width: 20,
        },
      }),
      css.keyframes({
        to: {
          backgroundColor: 'red',
        },
      }),
    ],
    animationTimingFunction: 'linear',
    backgroundColor: 'gold',
    height: '100%',
    shadowColor: 'black',
    width: 20,
  },
  parent: {
    // animationDuration: '10s',
    // animationIterationCount: 'infinite',
    // animationName: [
    //   css.keyframes({
    //     0: {
    //       width: 200,
    //     },
    //     0.5: {
    //       width: 350,
    //     },
    //     1: {
    //       width: 200,
    //     },
    //   }),
    //   css.keyframes({
    //     '50%': { height: 200 },
    //   }),
    //   css.keyframes({
    //     from: {
    //       transform: [{ rotate: '0deg' }],
    //     },
    //     to: {
    //       transform: [{ rotate: '360deg' }],
    //     },
    //   }),
    // ],
    // animationTimingFunction: 'linear',
    backgroundColor: 'gray',
    height: 65,
    width: 200,
  },
  row: {
    flexDirection: 'row',
    height: '50%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
