import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  clearRenderOutput,
  getTestComponent,
  mockAnimationTimer,
  mockWindowDimensions,
  recordAnimationUpdates,
  render,
  unmockAnimationTimer,
  unmockWindowDimensions,
  useTestRef,
  waitForAnimationUpdates,
} from '../../../ReJest/RuntimeTestsApi';

export const TRANSITION_REF = 'TRANSITION_REF';
export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  RIGHT_UP = 'RIGHT_UP',
  LEFT_UP = 'LEFT_UP',
}

export async function getSnapshotUpdates(
  layout: any,
  direction: Direction,
  snapshotLength: number,
  changeSize?: boolean,
) {
  await mockAnimationTimer();
  await mockWindowDimensions();

  const updatesContainer = await recordAnimationUpdates();
  if (direction === Direction.UP || direction === Direction.DOWN) {
    await render(<TransitionUpOrDown layout={layout} direction={direction} changeSize={!!changeSize} />);
  } else {
    await render(<TransitionLeftOrRight layout={layout} direction={direction} changeSize={!!changeSize} />);
  }
  await waitForAnimationUpdates(snapshotLength);
  const component = getTestComponent(TRANSITION_REF);
  const updates = updatesContainer.getUpdates(component);

  await unmockAnimationTimer();
  await unmockWindowDimensions();
  await clearRenderOutput();

  return updates;
}

export const TransitionUpOrDown = ({
  layout,
  direction,
  changeSize,
}: {
  layout: any;
  direction: Direction;
  changeSize?: boolean;
}) => {
  const [show, setShow] = useState(true);
  const ref = useTestRef(TRANSITION_REF);

  useEffect(() => {
    setShow(false);
  }, [setShow]);

  const mainBoxStyle = [styles.animatedBox, styles.mainBox, changeSize && !show ? styles.bigBox : {}];

  return (
    <View style={styles.containerVertical}>
      {direction === Direction.UP && (
        <>
          {show && <Animated.View layout={layout} style={styles.animatedBox} />}
          <Animated.View layout={layout} style={styles.animatedBox} />
          <Animated.View ref={ref} layout={layout} style={mainBoxStyle} />
        </>
      )}
      {direction === Direction.DOWN && (
        <>
          {!show && <Animated.View layout={layout} style={styles.animatedBox} />}
          <Animated.View layout={layout} style={styles.animatedBox} />
          <Animated.View ref={ref} layout={layout} style={mainBoxStyle} />
        </>
      )}
    </View>
  );
};

export const TransitionLeftOrRight = ({
  layout,
  direction,
  changeSize,
}: {
  layout: any;
  direction: Direction;
  changeSize?: boolean;
}) => {
  const [show, setShow] = useState(true);
  const ref = useTestRef(TRANSITION_REF);

  useEffect(() => {
    setShow(false);
  }, [setShow]);

  const mainBoxStyle = [styles.animatedBox, styles.mainBox, changeSize && !show ? styles.bigBox : {}];

  return (
    <View style={styles.containerHorizontal}>
      {direction === Direction.LEFT && (
        <>
          {show && <Animated.View layout={layout} style={styles.animatedBox} />}
          <Animated.View layout={layout} style={styles.animatedBox} />
          <Animated.View ref={ref} layout={layout} style={mainBoxStyle} />
        </>
      )}
      {direction === Direction.RIGHT && (
        <>
          {!show && <Animated.View layout={layout} style={styles.animatedBox} />}
          <Animated.View layout={layout} style={styles.animatedBox} />
          <Animated.View ref={ref} layout={layout} style={mainBoxStyle} />
        </>
      )}
      {direction === Direction.RIGHT_UP && (
        <>
          {show && <Animated.View layout={layout} style={styles.animatedBox} />}
          <Animated.View layout={layout} style={styles.animatedBox} />
          <Animated.View layout={layout} style={styles.animatedBox} />
          <Animated.View layout={layout} style={styles.animatedBox} />
          <Animated.View ref={ref} layout={layout} style={mainBoxStyle} />
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
          <Animated.View ref={ref} layout={layout} style={[styles.animatedBox, styles.mainBox]} />
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
  mainBox: { backgroundColor: 'orange', borderColor: 'darkorange' },
  bigBox: {
    width: 150,
    height: 200,
  },
});
