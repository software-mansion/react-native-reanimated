import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Text as SVGText, G } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const UpperTitles = [
  {
    id: 1,
    x: 25,
    y: 100,
    x2: 62,
    y2: 110,
    angle: -75,
    amgle2: 0,
    scoreColor: 'black',
    labelColor: 'black',
  },
  {
    id: 1,
    x: 72,
    y: 38,
    x2: 90,
    y2: 70,
    angle: -35,
    scoreColor: 'green',
    labelColor: 'green',
  },
  {
    id: 1,
    x: 145,
    y: 18,
    x2: 145,
    y2: 58,
    angle: -2,
    scoreColor: 'black',
    labelColor: 'black',
  },
  {
    id: 1,
    x: 219,
    y: 48,
    x2: 199,
    y2: 73,
    angle: 39,
    scoreColor: 'black',
    labelColor: 'white',
  },
  {
    id: 1,
    x: 255,
    y: 108,
    x2: 225,
    y2: 112,
    angle: 75,
    scoreColor: 'black',
    labelColor: 'white',
  },
];

function Speedometer(props) {
  const angle = useSharedValue(0);

  React.useEffect(() => {
    angle.value = props.score;
  }, [props.score, angle]);

  const rotate = interpolate(
    angle.value,
    [0, 100],
    [-112, 82],
    Extrapolation.CLAMP
  );

  const needleProps = useAnimatedProps(() => {
    return {
      transform: `rotate(${rotate} 180 130)`,
    };
  });

  return (
    <Svg width={281} height={281} viewBox="0 0 281 281" fill="none" {...props}>
      <Path
        d="M281 140.5a140.494 140.494 0 00-41.152-99.349A140.495 140.495 0 0086.733 10.695 140.5 140.5 0 000 140.5h79.898a60.6 60.6 0 0183.793-55.989 60.604 60.604 0 0137.411 55.989H281z"
        fill="#99C7FD"
      />
      <Path
        d="M281 140.5a140.494 140.494 0 00-41.152-99.349A140.495 140.495 0 0086.733 10.695 140.5 140.5 0 000 140.5h28.515a111.985 111.985 0 01223.97 0H281z"
        fill="#8ABAFC"
      />
      <Path
        d="M281 140.5A140.5 140.5 0 0034.882 47.844l60.062 52.691a60.599 60.599 0 0195.388 5.479 60.598 60.598 0 0110.77 34.486H281z"
        fill="#DEF7C7"
      />
      <Path
        d="M281 140.5a140.507 140.507 0 00-58.947-114.409A140.502 140.502 0 0094.674 7.683l26.06 75.53a60.604 60.604 0 0180.368 57.287H281z"
        fill="#FEE5B8"
      />
      <Path
        d="M281 140.5A140.502 140.502 0 0035.088 47.61L56.48 66.463A111.985 111.985 0 01252.485 140.5H281z"
        fill="#C6E2AC"
      />
      <Path
        d="M281 140.5a140.502 140.502 0 00-84.692-128.94l-31.736 73.324a60.598 60.598 0 0136.53 55.616H281z"
        fill="#E98471"
      />
      <Path
        d="M281 140.5c0-27.405-8.014-54.21-23.056-77.118l-66.787 43.855a60.6 60.6 0 019.945 33.263H281z"
        fill="#B74F3B"
      />
      <Path
        d="M177.836 140.254a37.57 37.57 0 00-11.008-26.574 37.571 37.571 0 00-40.955-8.146 37.583 37.583 0 00-23.2 34.72H177.836z"
        fill="#16394A"
      />
      <Path
        d="M177.836 140.254a37.57 37.57 0 00-11.008-26.574 37.571 37.571 0 00-40.955-8.146 37.583 37.583 0 00-23.2 34.72h11.378a26.195 26.195 0 017.675-18.528 26.195 26.195 0 0118.528-7.675 26.195 26.195 0 0124.209 16.176 26.198 26.198 0 011.995 10.027h11.378z"
        fill="#FBF6EE"
      />
      <Path
        d="M281 140.5a140.506 140.506 0 00-59.04-114.475A140.5 140.5 0 0094.46 7.758l9.343 26.94A111.987 111.987 0 01252.485 140.5H281z"
        fill="#F6DAA1"
      />

      <Path
        d="M281 140.5a140.5 140.5 0 00-84.764-128.972l-11.311 26.175a111.988 111.988 0 0167.56 102.797H281z"
        fill="#DC7A68"
      />
      <Path
        d="M281 140.5c0-27.37-7.994-54.144-23.001-77.034L234.152 79.1a111.986 111.986 0 0118.333 61.4H281z"
        fill="#D7624C"
      />
      <AnimatedPath
        d="M165.463 45.972l1.319.452-20.932 85.195a6.01 6.01 0 11-11.459-3.563l31.072-82.084z"
        fill="#2D4989"
        // transform={`rotate(${rotate} 140 130)`}
        animatedProps={needleProps}
      />
      <Circle cx={140.254} cy={129.938} r={3.19318} fill="#fff" />
      {UpperTitles.map((title, index) => {
        const item = props.types[index];

        return (
          <G key={title.id}>
            <SVGText
              x={title.x}
              transform={`rotate(${title.angle} ${title.x} ${title.y})`}
              y={title.y}
              fill={'red'}
              textAnchor="middle">
              {item?.score}
            </SVGText>
            <SVGText
              x={title.x2}
              y={title.y2}
              fill={'black'}
              textAnchor="middle">
              {'label'}
            </SVGText>
          </G>
        );
      })}
    </Svg>
  );
}

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.paragraph}>
        Change code in the editor and watch it change on your phone! Save to get
        a shareable url.
      </Text>
      <Speedometer score={140} types={[]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 100,
    backgroundColor: '#ecf0f1',
    padding: 8,
  },
  paragraph: {
    margin: 24,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
