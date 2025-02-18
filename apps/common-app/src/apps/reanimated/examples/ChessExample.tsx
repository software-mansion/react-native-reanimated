import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const N = 8; // number of rows and cols
const FIELD_SIZE = 40; // size of a single field in pixels
const CHESSMAN_SIZE = 30; // size of a chessman in pixels

function Chessboard() {
  return (
    <>
      {[...new Array(N)].map((_, row) => (
        <View style={styles.row} key={row}>
          {[...new Array(N)].map((_, col) => (
            <View
              style={[
                styles.field,
                (row + col) % 2 ? styles.darkField : styles.lightField,
              ]}
              key={col}
            />
          ))}
        </View>
      ))}
    </>
  );
}

function roundToNearestField(value: number) {
  'worklet';
  return clamp(Math.round(value / FIELD_SIZE), 0, N - 1) * FIELD_SIZE;
}

type ChessmanColor = 'black' | 'white';

interface ChessmanProps {
  row: number;
  col: number;
  color: ChessmanColor;
  symbol: string;
}

function Chessman({ row, col, color, symbol }: ChessmanProps) {
  const offset = useSharedValue({ x: col * FIELD_SIZE, y: row * FIELD_SIZE });

  const isActive = useSharedValue(false);

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      isActive.value = true;
    })
    .onChange((e) => {
      offset.value = {
        x: offset.value.x + e.changeX,
        y: offset.value.y + e.changeY,
      };
    })
    .onFinalize(() => {
      isActive.value = false;
      offset.value = withSpring(
        {
          x: roundToNearestField(offset.value.x),
          y: roundToNearestField(offset.value.y),
        },
        { duration: 300 }
      );
    });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(isActive.value ? 1.4 : 1, { duration: 100 }) },
      ],
    };
  });

  const animatedViewStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offset.value.x },
        { translateY: offset.value.y },
      ],
    };
  });

  const animatedFieldStyle = useAnimatedStyle(() => {
    return {
      display: isActive.value ? 'flex' : 'none',
      transform: [
        { translateX: roundToNearestField(offset.value.x) },
        { translateY: roundToNearestField(offset.value.y) },
      ],
    };
  });

  return (
    <>
      <Animated.View
        style={[styles.field, styles.targetField, animatedFieldStyle]}
      />
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.chessmanView, animatedViewStyle]}>
          <Animated.Text
            style={[
              styles.chessmanText,
              animatedTextStyle,
              color === 'white'
                ? styles.chessmanTextWhite
                : styles.chessmanTextBlack,
            ]}>
            {symbol}
          </Animated.Text>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

interface PawnRowProps {
  row: number;
  color: ChessmanColor;
}

function PawnRow({ row, color }: PawnRowProps) {
  return (
    <>
      {[...new Array(N)].map((_, col) => (
        <Chessman key={col} row={row} col={col} color={color} symbol="♟︎" />
      ))}
    </>
  );
}

interface FiguresRowProps {
  row: number;
  color: ChessmanColor;
}

const FIGURES_ROW_SYMBOLS = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'];

function FiguresRow({ row, color }: FiguresRowProps) {
  return (
    <>
      {FIGURES_ROW_SYMBOLS.map((symbol, col) => (
        <Chessman key={col} row={row} col={col} color={color} symbol={symbol} />
      ))}
    </>
  );
}

export default function ChessExample() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.relative}>
        <Chessboard />
        <FiguresRow row={0} color="black" />
        <PawnRow row={1} color="black" />
        <PawnRow row={N - 2} color="white" />
        <FiguresRow row={N - 1} color="white" />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relative: {
    position: 'relative',
    borderWidth: 10,
    borderStyle: 'solid',
    borderColor: 'black',
  },
  row: {
    flexDirection: 'row',
  },
  field: {
    width: FIELD_SIZE,
    height: FIELD_SIZE,
  },
  lightField: {
    backgroundColor: 'navajowhite',
  },
  darkField: {
    backgroundColor: 'peru',
  },
  targetField: {
    backgroundColor: 'rgba(0,255,0,0.5)',
    position: 'absolute',
  },
  chessmanView: {
    width: FIELD_SIZE,
    height: FIELD_SIZE,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chessmanText: {
    fontSize: CHESSMAN_SIZE,
  },
  chessmanTextBlack: {
    color: 'black',
    textShadowColor: 'white',
    textShadowRadius: 4,
  },
  chessmanTextWhite: {
    textShadowColor: 'black',
    textShadowRadius: 4,
    color: 'white',
  },
});
