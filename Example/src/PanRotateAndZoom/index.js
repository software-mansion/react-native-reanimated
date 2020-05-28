import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  State,
} from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

const { set, cond, block, eq, add, Value, event, concat, multiply } = Animated;

export default class Example extends Component {
  constructor(props) {
    super(props);
    this.X = new Value(0);
    this.Y = new Value(0);
    this.R = new Value(0);
    this.Z = new Value(1);
    const offsetX = new Value(0);
    const offsetY = new Value(0);
    const offsetR = new Value(0);
    const offsetZ = new Value(1);

    this.handlePan = event([
      {
        nativeEvent: ({ translationX: x, translationY: y, state }) =>
          block([
            set(this.X, add(x, offsetX)),
            set(this.Y, add(y, offsetY)),
            cond(eq(state, State.END), [
              set(offsetX, add(offsetX, x)),
              set(offsetY, add(offsetY, y)),
            ]),
          ]),
      },
    ]);

    this.handleRotate = event([
      {
        nativeEvent: ({ rotation: r, state }) =>
          block([
            set(this.R, add(r, offsetR)),
            cond(eq(state, State.END), [set(offsetR, add(offsetR, r))]),
          ]),
      },
    ]);

    this.handleZoom = event([
      {
        nativeEvent: ({ scale: z, state }) =>
          block([
            cond(eq(state, State.ACTIVE), set(this.Z, multiply(z, offsetZ))),
            cond(eq(state, State.END), [set(offsetZ, multiply(offsetZ, z))]),
          ]),
      },
    ]);
  }

  rotationRef = React.createRef();
  panRef = React.createRef();
  pinchRef = React.createRef();

  render() {
    return (
      <View style={styles.container}>
        <PanGestureHandler
          ref={this.panRef}
          minDist={10}
          simultaneousHandlers={[this.rotationRef, this.pinchRef]}
          onGestureEvent={this.handlePan}
          onHandlerStateChange={this.handlePan}>
          <Animated.View>
            <PinchGestureHandler
              ref={this.pinchRef}
              simultaneousHandlers={[this.rotationRef, this.panRef]}
              onGestureEvent={this.handleZoom}
              onHandlerStateChange={this.handleZoom}>
              <Animated.View>
                <RotationGestureHandler
                  ref={this.rotationRef}
                  simultaneousHandlers={[this.pinchRef, this.panRef]}
                  onGestureEvent={this.handleRotate}
                  onHandlerStateChange={this.handleRotate}>
                  <Animated.Image
                    resizeMode="contain"
                    style={[
                      styles.box,
                      {
                        transform: [
                          { translateX: this.X },
                          { translateY: this.Y },
                          { rotate: concat(this.R, 'rad') },
                          { scale: this.Z },
                        ],
                      },
                    ]}
                    source={require('./react-hexagon.png')}
                  />
                </RotationGestureHandler>
              </Animated.View>
            </PinchGestureHandler>
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  }
}

const IMAGE_SIZE = 200;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
});
