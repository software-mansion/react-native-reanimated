import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTestRef } from '../../../ReJest/RuntimeTestsApi';

export const TRANSITION_REF = 'TRANSITION_REF';
export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  RIGHT_UP = 'RIGHT_UP',
  LEFT_UP = 'LEFT_UP',
}

interface TransitionComponentProps {
  layout: any;
  direction: Direction;
  changeSize?: boolean;
}

const MainBox = ({ layout, changeSize }: Omit<TransitionComponentProps, 'direction'> & { show: boolean }) => {
  const [show, setShow] = useState(true);
  useEffect(() => {
    setShow(false);
  }, [setShow]);

  const ref = useTestRef(TRANSITION_REF);
  const mainBoxStyle = [styles.animatedBox, styles.mainBox, changeSize && !show ? styles.bigBox : {}];

  return <Animated.View ref={ref} layout={layout} style={mainBoxStyle} />;
};

export const TransitionUpOrDown = ({ layout, direction, changeSize }: TransitionComponentProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    setShow(false);
  }, [setShow]);

  return (
    <View style={styles.containerVertical}>
      {direction === Direction.UP && (
        <>
          {show && <Animated.View layout={layout} style={styles.animatedBox} />}
          <Animated.View layout={layout} style={styles.animatedBox} />
          <MainBox show={show} layout={layout} changeSize={changeSize} />
        </>
      )}
      {direction === Direction.DOWN && (
        <>
          {!show && <Animated.View layout={layout} style={styles.animatedBox} />}
          <Animated.View layout={layout} style={styles.animatedBox} />
          <MainBox show={show} layout={layout} changeSize={changeSize} />
        </>
      )}
    </View>
  );
};

export const TransitionLeftOrRight = ({ layout, direction, changeSize }: TransitionComponentProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    setShow(false);
  }, [setShow]);

  return (
    <View style={styles.containerHorizontal}>
      {direction === Direction.LEFT && (
        <>
          {show && <Animated.View layout={layout} style={styles.animatedBox} />}
          <Animated.View layout={layout} style={styles.animatedBox} />
          <MainBox show={show} layout={layout} changeSize={changeSize} />
        </>
      )}
      {direction === Direction.RIGHT && (
        <>
          {!show && <Animated.View layout={layout} style={styles.animatedBox} />}
          <Animated.View layout={layout} style={styles.animatedBox} />
          <MainBox show={show} layout={layout} changeSize={changeSize} />
        </>
      )}
      {direction === Direction.RIGHT_UP && (
        <>
          {show && <Animated.View layout={layout} style={styles.animatedBox} />}
          <Animated.View layout={layout} style={styles.animatedBox} />
          <Animated.View layout={layout} style={styles.animatedBox} />
          <Animated.View layout={layout} style={styles.animatedBox} />
          <MainBox show={show} layout={layout} changeSize={changeSize} />
        </>
      )}
      {direction === Direction.LEFT_UP && (
        <>
          {show && (
            <>
              <Animated.View layout={layout} style={styles.animatedBox} />
              <Animated.View layout={layout} style={styles.animatedBox} />
              <Animated.View layout={layout} style={styles.animatedBox} />
              <Animated.View layout={layout} style={styles.animatedBox} />
              <Animated.View layout={layout} style={styles.animatedBox} />
            </>
          )}
          <Animated.View layout={layout} style={styles.animatedBox} />
          <Animated.View layout={layout} style={styles.animatedBox} />
          <MainBox show={show} layout={layout} changeSize={changeSize} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  containerVertical: {
    flex: 1,
    flexDirection: 'column',
    width: 250,
  },
  containerHorizontal: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 250,
  },
  animatedBox: {
    backgroundColor: 'powderblue',
    borderColor: 'steelblue',
    borderWidth: 1,
    width: 100,
    height: 100,
    margin: 5,
  },
  mainBox: {
    backgroundColor: 'orange',
    borderColor: 'darkorange',
  },
  bigBox: {
    width: 150,
    height: 200,
  },
});
