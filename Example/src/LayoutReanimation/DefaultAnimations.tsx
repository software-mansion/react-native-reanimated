import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, TouchableWithoutFeedback 
} from 'react-native';
import Animated, { 
  AnimatedLayout, SlideInRight, SlideOutRight, SlideInUp, SlideInDown, 
  SlideOutUp, SlideOutDown, FadeIn, FadeInRight, FadeInLeft, FadeInUp, 
  FadeInDown, FadeOut, FadeOutRight, FadeOutLeft, FadeOutUp, FadeOutDown,
  SlideOutLeft, SlideInLeft, ZoomIn, ZoomInRotate, ZoomInRight, ZoomInLeft,
  ZoomInUp, ZoomInDown, ZoomInEasyUp, ZoomInEasyDown, ZoomOut,
  ZoomOutRotate, ZoomOutRight, ZoomOutLeft, ZoomOutUp, ZoomOutDown,
  ZoomOutEasyUp, ZoomOutEasyDown, StretchInX, StretchInY, StretchOutX,
  StretchOutY, FlipInXUp, FlipInYLeft, FlipInXDown, FlipInYRight,
  FlipInEasyX, FlipInEasyY, FlipOutXUp, FlipOutYLeft, FlipOutXDown,
  FlipOutYRight, FlipOutEasyX, FlipOutEasyY, BounceIn, BounceInDown,
  BounceInUp, BounceInLeft, BounceInRight, BounceOut, BounceOutDown,
  BounceOutUp, BounceOutLeft, BounceOutRight, 
  LightSpeedInRight, LightSpeedInLeft, LightSpeedOutRight, LightSpeedOutLeft, 
  PinwheelIn, PinwheelOut, RotateInDownLeft, RotateInDownRight, RotateInUpLeft, RotateInUpRight, 
  RotateOutDownLeft, RotateOutDownRight, RotateOutUpLeft, RotateOutUpRight, RollInLeft, RollInRight, RollOutLeft, RollOutRight
} from 'react-native-reanimated';

interface AnimatedBlockProps {
  name: string, animatedStyle: object, defaultShow?: boolean
 }

const AnimatedBlock = ({ name, animatedStyle, defaultShow }: AnimatedBlockProps) => {
  const [show, setShow] = useState(defaultShow);
  return (
    <AnimatedLayout>
      <View style={styles.animatedBox}>
        {show ? 
          <TouchableWithoutFeedback onPress={() => setShow(!show)}>
            <Animated.View
              style={styles.animatedBlock}
              {...animatedStyle}
            >
              <Text style={styles.animatedText}>{name}</Text>
            </Animated.View>
          </TouchableWithoutFeedback>
        : null}
        {!show ? 
          <Animated.View entering={'entering' in animatedStyle ? null : FadeIn.delay(350)}>
            <TouchableOpacity 
              style={styles.animatedBlockPlaceholder} 
              onPress={() => setShow(!show)}
            >
              <Text style={styles.animatedTextPlaceholder}>{name}</Text>
            </TouchableOpacity>
          </Animated.View>
        : null}
      </View>
    </AnimatedLayout>
  );
}


export function DefaultAnimations(): React.ReactElement {
  return (
    <ScrollView style={{flexDirection: 'column'}}>

      <Text style={styles.groupText}>Fade in</Text>
      <AnimatedBlock name="FadeIn" animatedStyle={{entering: FadeIn}} />
      <AnimatedBlock name="FadeInRight" animatedStyle={{entering: FadeInRight}} />
      <AnimatedBlock name="FadeInLeft" animatedStyle={{entering: FadeInLeft}} />
      <AnimatedBlock name="FadeInUp" animatedStyle={{entering: FadeInUp}} />
      <AnimatedBlock name="FadeInDown" animatedStyle={{entering: FadeInDown}} />

      <Text style={styles.groupText}>Fade out</Text>
      <AnimatedBlock name="FadeOut" animatedStyle={{exiting: FadeOut}} defaultShow={true} />
      <AnimatedBlock name="FadeOutRight" animatedStyle={{exiting: FadeOutRight}} defaultShow={true} />
      <AnimatedBlock name="FadeOutLeft" animatedStyle={{exiting: FadeOutLeft}} defaultShow={true} />
      <AnimatedBlock name="FadeOutUp" animatedStyle={{exiting: FadeOutUp}} defaultShow={true} />
      <AnimatedBlock name="FadeOutDown" animatedStyle={{exiting: FadeOutDown}} defaultShow={true} />

      <Text style={styles.groupText}>Bounce in</Text>
      <AnimatedBlock name="BounceIn" animatedStyle={{entering: BounceIn}} />
      <AnimatedBlock name="BounceInRight" animatedStyle={{entering: BounceInRight}} />
      <AnimatedBlock name="BounceInLeft" animatedStyle={{entering: BounceInLeft}} />
      <AnimatedBlock name="BounceInUp" animatedStyle={{entering: BounceInUp}} />
      <AnimatedBlock name="BounceInDown" animatedStyle={{entering: BounceInDown}} />

      <Text style={styles.groupText}>Bounce out</Text>
      <AnimatedBlock name="BounceOut" animatedStyle={{exiting: BounceOut}} defaultShow={true} />
      <AnimatedBlock name="BounceOutRight" animatedStyle={{exiting: BounceOutRight}} defaultShow={true} />
      <AnimatedBlock name="BounceOutLeft" animatedStyle={{exiting: BounceOutLeft}} defaultShow={true} />
      <AnimatedBlock name="BounceOutUp" animatedStyle={{exiting: BounceOutUp}} defaultShow={true} />
      <AnimatedBlock name="BounceOutDown" animatedStyle={{exiting: BounceOutDown}} defaultShow={true} />

      <Text style={styles.groupText}>Flip in</Text>
      <AnimatedBlock name="FlipInYRight" animatedStyle={{entering: FlipInYRight}} />
      <AnimatedBlock name="FlipInYLeft" animatedStyle={{entering: FlipInYLeft}} />
      <AnimatedBlock name="FlipInXUp" animatedStyle={{entering: FlipInXUp}} />
      <AnimatedBlock name="FlipInXDown" animatedStyle={{entering: FlipInXDown}} />
      <AnimatedBlock name="FlipInEasyX" animatedStyle={{entering: FlipInEasyX}} />
      <AnimatedBlock name="FlipInEasyY" animatedStyle={{entering: FlipInEasyY}} />

      <Text style={styles.groupText}>Flip out</Text>
      <AnimatedBlock name="FlipOutYRight" animatedStyle={{exiting: FlipOutYRight}} defaultShow={true} />
      <AnimatedBlock name="FlipOutYLeft" animatedStyle={{exiting: FlipOutYLeft}} defaultShow={true} />
      <AnimatedBlock name="FlipOutXUp" animatedStyle={{exiting: FlipOutXUp}} defaultShow={true} />
      <AnimatedBlock name="FlipOutXDown" animatedStyle={{exiting: FlipOutXDown}} defaultShow={true} />
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
      <AnimatedBlock name="ZoomOutRight" animatedStyle={{exiting: ZoomOutRight}} defaultShow={true} />
      <AnimatedBlock name="ZoomOutLeft" animatedStyle={{exiting: ZoomOutLeft}} defaultShow={true} />
      <AnimatedBlock name="ZoomOutUp" animatedStyle={{exiting: ZoomOutUp}} defaultShow={true} />
      <AnimatedBlock name="ZoomOutDown" animatedStyle={{exiting: ZoomOutDown}} defaultShow={true} />
      <AnimatedBlock name="ZoomOutEasyUp" animatedStyle={{exiting: ZoomOutEasyUp}} defaultShow={true} />
      <AnimatedBlock name="ZoomOutEasyDown" animatedStyle={{exiting: ZoomOutEasyDown}} defaultShow={true} />

      <Text style={styles.groupText}>Slide in</Text>
      <AnimatedBlock name="SlideInRight" animatedStyle={{entering: SlideInRight}} />
      <AnimatedBlock name="SlideInLeft" animatedStyle={{entering: SlideInLeft}} />
      <AnimatedBlock name="SlideInUp" animatedStyle={{entering: SlideInUp}} />
      <AnimatedBlock name="SlideInDown" animatedStyle={{entering: SlideInDown}} />

      <Text style={styles.groupText}>Slide out</Text>
      <AnimatedBlock name="SlideOutRight" animatedStyle={{exiting: SlideOutRight}} defaultShow={true} />
      <AnimatedBlock name="SlideOutLeft" animatedStyle={{exiting: SlideOutLeft}} defaultShow={true} />
      <AnimatedBlock name="SlideOutUp" animatedStyle={{exiting: SlideOutUp}} defaultShow={true} />
      <AnimatedBlock name="SlideOutDown" animatedStyle={{exiting: SlideOutDown}} defaultShow={true} />

      <Text style={styles.groupText}>LightSpeed in</Text>
      <AnimatedBlock name="LightSpeedInRight" animatedStyle={{entering: LightSpeedInRight}} />
      <AnimatedBlock name="LightSpeedInLeft" animatedStyle={{entering: LightSpeedInLeft}} />

      <Text style={styles.groupText}>LightSpeed out</Text>
      <AnimatedBlock name="LightSpeedOutRight" animatedStyle={{exiting: LightSpeedOutRight}} defaultShow/>
      <AnimatedBlock name="LightSpeedOutLeft" animatedStyle={{exiting: LightSpeedOutLeft}} defaultShow />

      <Text style={styles.groupText}>Pinwheel</Text>
      <AnimatedBlock name="PinwheelIn" animatedStyle={{entering: PinwheelIn}} />
      <AnimatedBlock name="PinwheelOut" animatedStyle={{exiting: PinwheelOut}} defaultShow/>

      <Text style={styles.groupText}>Rotate in</Text>
      <AnimatedBlock name="RotateInDownLeft" animatedStyle={{entering: RotateInDownLeft}} />
      <AnimatedBlock name="RotateInDownRight" animatedStyle={{entering: RotateInDownRight}} />
      <AnimatedBlock name="RotateInUpLeft" animatedStyle={{entering: RotateInUpLeft}} />
      <AnimatedBlock name="RotateInUpRight" animatedStyle={{entering: RotateInUpRight}} />

      <Text style={styles.groupText}>Rotate out</Text>
      <AnimatedBlock name="RotateOutDownLeft" animatedStyle={{exiting: RotateOutDownLeft}} defaultShow/>
      <AnimatedBlock name="RotateOutDownRight" animatedStyle={{exiting: RotateOutDownRight}} defaultShow/>
      <AnimatedBlock name="RotateOutUpLeft" animatedStyle={{exiting: RotateOutUpLeft}} defaultShow/>
      <AnimatedBlock name="RotateOutUpRight" animatedStyle={{exiting: RotateOutUpRight}} defaultShow/>

      <Text style={styles.groupText}>Roll</Text>
      <AnimatedBlock name="RollInLeft" animatedStyle={{entering: RollInLeft}} />
      <AnimatedBlock name="RollInRight" animatedStyle={{entering: RollInRight}} />
      <AnimatedBlock name="RollOutLeft" animatedStyle={{exiting: RollOutLeft}} defaultShow/>
      <AnimatedBlock name="RollOutRight" animatedStyle={{exiting: RollOutRight}} defaultShow/>
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