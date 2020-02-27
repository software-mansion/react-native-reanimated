import React from 'react';
import {
  Text,
  View,
  YellowBox,
  TouchableHighlight,
  NativeModules,
} from 'react-native';

import Animated, { SharedValue, Worklet } from 'react-native-reanimated';
import { WorkletEventHandler } from '../src/Animated';
import AnimatedSharedValue from '../src/core/AnimatedSharedValue';
import { PanGestureHandler } from 'react-native-gesture-handler';
const { ReanimatedModule } = NativeModules;


YellowBox.ignoreWarnings([
  'Warning: isMounted(...) is deprecated',
  'Module RCTImageLoader',
]);
// refers to bug in React Navigation which should be fixed soon
// https://github.com/react-navigation/react-navigation/issues/3956

class MainScreen extends React.Component {
  static navigationOptions = {
    title: '🎬 Reanimated Examples',
  };

  constructor(props) {
    super(props);
    this.sv1 = new SharedValue(0);
    this.sv2 = new SharedValue(1);
    this.sv3 = new SharedValue(-100);

    this.worklet = new Worklet((sv1, sv2, sv3) => {
      'worklet';
      const x = sv1.get();
      const y = sv2.get();
      sv3.set(x+y);
      return true;
    });

    this.viewWidth = new SharedValue(40);
    this.animatedViewWidth = new AnimatedSharedValue(this.viewWidth);
    this.animationStarted = new SharedValue(0);
    this.animationStart = new SharedValue(0);
    this.stringVal = new SharedValue("text");

    this.worklet3 = new Worklet(function(viewWidth, animationStarted, animationStart, stringVal) { // cannot be arrow function
      'worklet';
      if (animationStarted.get() === 0) {
        this.log(stringVal.get()); 
        animationStarted.set(1);
        animationStart.set(Date.now());    
      } 

      const duration = 5000;
      const endTime = animationStart.get() + duration;
      const progress = (Date.now() - animationStart.get())/duration;
      const maxWidth = 80;

      this.log((Date.now()-endTime).toString());
      this.log('delta');

      if (Date.now() > endTime) { // end condtion
        return true; // end animation
      }

      viewWidth.set(maxWidth * progress);
      return false; // continue 
    });

    this.eventString = new SharedValue('event');

    this.worklet4 = new Worklet(function(viewWidth, eventString){
      'worklet';
      this.log('event');
      this.log(this.event.x);
      viewWidth.set(this.event.x);

      if (this.event.state === 5) {
        return true;
      }
      return false;
    });

    this.workletEventHandler = new WorkletEventHandler(this.worklet4, [this.viewWidth, this.eventString]);
  }

  componentDidMount() {
    this.release = this.worklet3.apply([this.viewWidth, this.animationStarted, this.animationStart, this.stringVal]);
  }

  componentWillUnmount() {
    this.sv1.release();
    this.sv2.release();
    this.sv3.release();
    this.viewWidth.release();
    this.animationStarted.release();
    this.stringVal.release();
    this.animationStart.release();
    this.release();
    this.worklet.release();
    this.worklet3.release();
  }

  render() {
    return (
      <View>
        <Text>dziala</Text>
        <TouchableHighlight onPress={ async () => {console.warn("ok");}}>
          <Text> remember callback </Text>
        </TouchableHighlight>
        <TouchableHighlight onPress={ async () => {
          await ReanimatedModule.custom();
            console.log("ok byl call");
          }} >
          <Text> custom </Text>
        </TouchableHighlight>
        <PanGestureHandler
          maxPointers={1}
          minDist={10}
          onGestureEvent={this.workletEventHandler}
          onHandlerStateChange={this.workletEventHandler}>
          <Animated.View style={{width: this.animatedViewWidth, height: 100, backgroundColor:'black',}} /> 
        </PanGestureHandler>
      </View>
    );
  }

}


export default MainScreen;
