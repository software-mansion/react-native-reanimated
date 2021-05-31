import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import Animated, { 
  AnimatedLayout, 
  SlideInRight, 
  SlideOutRight,
  SlideInUp, 
  SlideInDown, 
  SlideOutUp, 
  SlideOutDown,
  OpacityIn, 
  OpacityOut, 
  SlideOutLeft, 
  SlideInLeft,
  ZoomIn,
  ZoomInRotate,
  ZoomOut,
  ZoomOutRotate,
  StretchInX,
  StretchInY,
  StretchOutX,
  StretchOutY,
  FlipInXUp,
  FlipInYLeft,
  FlipInXDown,
  FlipInYRight,
  FlipInEasyX,
  FlipInEasyY,
  FlipOutXUp,
  FlipOutYLeft,
  FlipOutXDown,
  FlipOutYRight,
  FlipOutEasyX,
  FlipOutEasyY,
  ZoomInRight,
  ZoomInLeft,
  ZoomInUp,
  ZoomInDown,
  ZoomInEasyUp,
  ZoomInEasyDown,
} from 'react-native-reanimated';

const AnimatedBlock = (props: { name: string, animatedStyle: object, defaultShow?: boolean }) => {
  const { name, animatedStyle, defaultShow } = props;
  const [show, setShow] = useState(defaultShow);
  return (
    <AnimatedLayout>
      <View style={styles.animatedBox}>
        {show && 
          <TouchableWithoutFeedback onPress={() => setShow(!show)}>
            <Animated.View
              style={styles.animatedBlock}
              {...animatedStyle}
            >
              <Text style={styles.animatedText}>{name}</Text>
            </Animated.View>
          </TouchableWithoutFeedback>
        }
        {!show && 
          <Animated.View entering={'entering' in animatedStyle ? null : OpacityIn.delay(350)}>
            <TouchableOpacity 
              style={styles.animatedBlockPlaceholder} 
              onPress={() => setShow(!show)}
            >
              <Text style={styles.animatedTextPlaceholder}>{name}</Text>
            </TouchableOpacity>
          </Animated.View>
        }
      </View>
    </AnimatedLayout>
  );
}


export function DefaultAnimations(): React.ReactElement {
  return (
    <ScrollView style={{flexDirection: 'column'}}>

      <Text style={styles.groupText}>Fade</Text>
      <Text style={styles.groupText}>Bounce</Text>

      <Text style={styles.groupText}>Flip in</Text>
      <AnimatedBlock name="FlipInXUp" animatedStyle={{entering: FlipInXUp}} />
      <AnimatedBlock name="FlipInXDown" animatedStyle={{entering: FlipInXDown}} />
      <AnimatedBlock name="FlipInYLeft" animatedStyle={{entering: FlipInYLeft}} />
      <AnimatedBlock name="FlipInYRight" animatedStyle={{entering: FlipInYRight}} />
      <AnimatedBlock name="FlipInEasyX" animatedStyle={{entering: FlipInEasyX}} />
      <AnimatedBlock name="FlipInEasyY" animatedStyle={{entering: FlipInEasyY}} />

      <Text style={styles.groupText}>Flip out</Text>
      <AnimatedBlock name="FlipOutXUp" animatedStyle={{exiting: FlipOutXUp}} defaultShow={true} />
      <AnimatedBlock name="FlipOutXDown" animatedStyle={{exiting: FlipOutXDown}} defaultShow={true} />
      <AnimatedBlock name="FlipOutYLeft" animatedStyle={{exiting: FlipOutYLeft}} defaultShow={true} />
      <AnimatedBlock name="FlipOutYRight" animatedStyle={{exiting: FlipOutYRight}} defaultShow={true} />
      <AnimatedBlock name="FlipOutEasyX" animatedStyle={{exiting: FlipOutEasyX}} defaultShow={true} />
      <AnimatedBlock name="FlipOutEasyY" animatedStyle={{exiting: FlipOutEasyY}} defaultShow={true} />

      <Text style={styles.groupText}>Stretch in</Text>
      <AnimatedBlock name="StretchInX" animatedStyle={{entering: StretchInX}} />
      <AnimatedBlock name="StretchInY" animatedStyle={{entering: StretchInY}} />

      <Text style={styles.groupText}>Stretch out</Text>
      <AnimatedBlock name="StretchOutX" animatedStyle={{exiting: StretchOutX}} defaultShow={true} />
      <AnimatedBlock name="StretchOutY" animatedStyle={{exiting: StretchOutY}} defaultShow={true} />

      <Text style={styles.groupText}>Zoom in</Text>
      <AnimatedBlock name="ZoomIn" animatedStyle={{entering: ZoomIn}} />
      <AnimatedBlock name="ZoomInRotate" animatedStyle={{entering: ZoomInRotate}} />
      <AnimatedBlock name="ZoomInRight" animatedStyle={{entering: ZoomInRight}} />
      <AnimatedBlock name="ZoomInLeft" animatedStyle={{entering: ZoomInLeft}} />
      <AnimatedBlock name="ZoomInUp" animatedStyle={{entering: ZoomInUp}} />
      <AnimatedBlock name="ZoomInDown" animatedStyle={{entering: ZoomInDown}} />
      <AnimatedBlock name="ZoomInEasyUp" animatedStyle={{entering: ZoomInEasyUp}} />
      <AnimatedBlock name="ZoomInEasyDown" animatedStyle={{entering: ZoomInEasyDown}} />

      <Text style={styles.groupText}>Zoom out</Text>
      <AnimatedBlock name="ZoomOut" animatedStyle={{exiting: ZoomOut}} defaultShow={true} />
      <AnimatedBlock name="ZoomOutRotate" animatedStyle={{exiting: ZoomOutRotate}} defaultShow={true} />

      <Text style={styles.groupText}>Opacity in</Text>
      <AnimatedBlock name="OpacityIn" animatedStyle={{entering: OpacityIn}} />

      <Text style={styles.groupText}>Opacity out</Text>
      <AnimatedBlock name="OpacityOut" animatedStyle={{exiting: OpacityOut}} defaultShow={true} />

      <Text style={styles.groupText}>Slide in</Text>
      <AnimatedBlock name="SlideInUp" animatedStyle={{entering: SlideInUp}} />
      <AnimatedBlock name="SlideInDown" animatedStyle={{entering: SlideInDown}} />
      <AnimatedBlock name="SlideInRight" animatedStyle={{entering: SlideInRight}} />
      <AnimatedBlock name="SlideInLeft" animatedStyle={{entering: SlideInLeft}} />

      <Text style={styles.groupText}>Slide out</Text>
      <AnimatedBlock name="SlideOutUp" animatedStyle={{exiting: SlideOutUp}} defaultShow={true} />
      <AnimatedBlock name="SlideOutDown" animatedStyle={{exiting: SlideOutDown}} defaultShow={true} />
      <AnimatedBlock name="SlideOutRight" animatedStyle={{exiting: SlideOutRight}} defaultShow={true} />
      <AnimatedBlock name="SlideOutLeft" animatedStyle={{exiting: SlideOutLeft}} defaultShow={true} />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  groupText: {
    fontSize: 20,
    paddingTop: 5,
    paddingLeft: 5,
    paddingBottom: 5
  },
  animatedBlock: {
    height: 60,
    width: 300,
    borderWidth: 3,
    borderColor: '#001a72',
    backgroundColor: '#001a72',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  animatedTextPlaceholder: {
    color: '#001a72',
    fontSize: 20
  },
  animatedBlockPlaceholder: {
    height: 60,
    width: 300,
    borderWidth: 3,
    borderColor: '#001a72',
    alignItems: 'center', 
    justifyContent: 'center',
    borderStyle: 'dashed'
  },
  animatedText: {
    color: '#ffffff',
    fontSize: 20
  },
  animatedBox: {
    padding: 5,
    alignItems: 'center',
  },
});