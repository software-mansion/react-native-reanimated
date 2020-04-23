import React from 'react';
import Animated, { useSharedValue, useWorklet, useEventWorklet, useAnimatedStyle } from 'react-native-reanimated';
import { View, Text, Dimensions, StyleSheet, SafeAreaView, TouchableWithoutFeedback } from 'react-native';
import Svg, { Path } from "react-native-svg";
import * as shape from "d3-shape";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faCoffee, faTrash, faUser, faList, faReply } from '@fortawesome/free-solid-svg-icons'
import { TapGestureHandler } from 'react-native-gesture-handler';


const AnimatedSvg = Animated.createAnimatedComponent(Path);
const { width, height } = Dimensions.get("window");
const tabHeight = 64;

let tabs = [
    {
        name: "coffee",
        item: faCoffee,
    },
    {
        name: "list",
        item: faList,
    },
    {
        name: "reply",
        item: faReply,
    },
    {
        name: "trash",
        item: faTrash,
    },
    {
        name: "user",
        item: faUser,
    },
];
const tabWidth = width / tabs.length;

const getPath = (): string => {
const left = shape.line().x(d => d.x).y(d => d.y)([
        { x: 0, y: 0 },
        { x: width, y: 0 },
    ]);
    const tab = shape.line().x(d => d.x).y(d => d.y).curve(shape.curveBasis)([
        { x: width, y: 0 },
        { x: width + 5, y: 0 },
        { x: width + 10, y: 10 },
        { x: width + 15, y: tabHeight },
        { x: width + tabWidth - 15, y: tabHeight },
        { x: width + tabWidth - 10, y: 10 },
        { x: width + tabWidth - 5, y: 0 },
        { x: width + tabWidth, y: 0 },
    ]);
    const right = shape.line().x(d => d.x).y(d => d.y)([
        { x: width + tabWidth, y: 0 },
        { x: width * 2, y: 0 },
        { x: width * 2, y: tabHeight },
        { x: 0, y: tabHeight },
        { x: 0, y: 0 },
    ]);
    return `${left} ${tab} ${right}`;
};
const d = getPath()
console.log('here path')
console.log(d)

const tabBarStyles = StyleSheet.create({
    dummyPusher: {
        flex: 1,
    },
    container: {
        backgroundColor: 'orange',
        width,
        height,
        flex: 1,
    }
})

const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      backgroundColor: 'white',
    },
    tab: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      height: 64,
    },
    activeIcon: {
      backgroundColor: "white",
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    followerWrapper: {
      position: 'absolute',
      left: 0,
      top: 0,
      backgroundColor: 'white',
      zIndex: 3,
      width: tabWidth,
      height: tabWidth,
    },
    lowerFollower: {
      backgroundColor: 'orange',
      width: tabWidth,
      height: 20,
      left: 0,
      position: 'absolute',
      zIndex: 4,
    },
    upperFollower: {
      borderRadius: 500,
      backgroundColor: 'orange',
      width: tabWidth,
      height: tabWidth,
      position: 'absolute',
      top: -tabWidth/3.5,
      left: 0,
      zIndex: 3,
    }
  });

const Bar = () => {
    const tabWidthSV = useSharedValue(tabWidth)
    const tabHeightSV = useSharedValue(tabHeight)
    
    const activeIndex = useSharedValue(0)
    const followerPosition = useSharedValue(0)
    const newIndex = useSharedValue(-1)
    const tabsSA = useSharedValue(tabs.map((item, index) => {
        return {
            active: (index === 0) ? 1 : 0,
            translateY: (index === 0) ? 0 : 64,
            opacity: (index === 0) ? 0 : 1,
            opacityReverse: (index !== 0) ? 0 : 1,
        }
    }))

    const values = {
      opacity: {
        min: 0,
        max: 1,
        step: .07,
      },
      translateY: {
        min: 0,
        max: 64,
        step: 4,
      },
    }

    const changeActive = useWorklet(function(input) {
      'worklet'
      this.log('[change active] begin ' + input.newIndex.value)
      let changed = false
      input.tabsSA[input.activeIndex.value].active.set(0)
      input.tabsSA[input.newIndex.value].active.set(1)

      
      if (input.tabsSA[input.activeIndex.value].translateY.value < input.values.translateY.max.value) {
        input.tabsSA[input.activeIndex.value].translateY.set(input.tabsSA[input.activeIndex.value].translateY.value + input.values.translateY.step.value)
        changed = true
      }

      if (input.tabsSA[input.newIndex.value].opacity.value > input.values.opacity.min.value) {
        input.tabsSA[input.activeIndex.value].opacityReverse.set(input.tabsSA[input.activeIndex.value].opacityReverse.value - input.values.opacity.step.value)
        input.tabsSA[input.newIndex.value].opacity.set(input.tabsSA[input.newIndex.value].opacity.value - input.values.opacity.step.value)
        changed = true
      }

      if (input.tabsSA[input.activeIndex.value].opacity.value < input.values.opacity.max.value) {
        input.tabsSA[input.activeIndex.value].opacity.set(input.tabsSA[input.activeIndex.value].opacity.value + input.values.opacity.step.value)
        input.tabsSA[input.newIndex.value].opacityReverse.set(input.tabsSA[input.newIndex.value].opacityReverse.value + input.values.opacity.step.value)
        changed = true
      }

      if (input.tabsSA[input.newIndex.value].translateY.value > input.values.translateY.min.value) {
        input.tabsSA[input.newIndex.value].translateY.set(input.tabsSA[input.newIndex.value].translateY.value - input.values.translateY.step.value)
        changed = true
      }

      const newFollowerDest = input.newIndex.value * input.tabWidthSV.value
      if (input.newIndex.value > input.activeIndex.value) {
        // inc
        if (input.followerPosition.value < newFollowerDest) {
          input.followerPosition.set(input.followerPosition.value + 10)
          changed = true
        } else if (input.followerPosition.value !== newFollowerDest) {
          input.followerPosition.set(newFollowerDest)
          changed = true
        }
      } else {
        // dec
        if (input.followerPosition.value > newFollowerDest) {
          input.followerPosition.set(input.followerPosition.value - 10)
          changed = true
        } else if (input.followerPosition.value !== newFollowerDest) {
          input.followerPosition.set(newFollowerDest)
          changed = true
        }
      }

      //input.activeIndex.set(index)
      if (!changed) { // here condition when all values reached destinations
        this.log('[change active] end ' + input.newIndex.value)
        input.activeIndex.set(input.newIndex.value)
        input.newIndex.set(-1)
        return true
      }
    }, {tabsSA, activeIndex, newIndex, values, tabWidthSV, followerPosition})

    const opWorklet = useEventWorklet(function(input) {
        'worklet'
        this.log('[event] state' + this.event.state)
        if (this.event.state !== 2) {
            return true
        }
        const index = Math.floor(this.event.absoluteX / input.tabWidthSV.value)
        this.log('[event] index: ' + index + '/' + input.activeIndex.value)
        if (index !== input.activeIndex.value) {
          /*
            input.tabsSA[input.activeIndex.value].active.set(0)
            input.tabsSA[input.activeIndex.value].opacity.set(1)
            input.tabsSA[input.activeIndex.value].opacityReverse.set(0)
            input.tabsSA[input.activeIndex.value].translateY.set(64)

            input.tabsSA[index].active.set(1)
            input.tabsSA[index].opacity.set(0)
            input.tabsSA[index].opacityReverse.set(1)
            input.tabsSA[index].translateY.set(0)

            input.activeIndex.set(index)*/
            if (input.newIndex.value === -1) {
              input.newIndex.set(index)
              input.changeActive.start()
            }
        }

    }, { tabWidthSV, tabsSA, activeIndex, tabHeightSV, values, changeActive, newIndex })
    
    return (
        <View style={styles.container}>
          <Animated.View style={ { ...styles.followerWrapper, left: followerPosition, } }>
            <View style={ styles.lowerFollower } />
            <View style={ styles.upperFollower } />
          </Animated.View>
          {
            tabs.map((tab, key) => {
              const tabWidth = width / tabs.length;
              const cursor = tabWidth * key;
              return (
                <React.Fragment {...{ key }}>
                  <TapGestureHandler onHandlerStateChange={opWorklet}>
                    <Animated.View style={[
                          styles.tab,
                          {
                            backgroundColor: 'white',
                            opacity: tabsSA[key].opacity,
                            zIndex: 1,
                          }
                    ]}>
                      <FontAwesomeIcon icon={ tab.item } color="black" size={25} />
                    </Animated.View>
                  </TapGestureHandler>
                  <Animated.View
                    style={{
                      position: "absolute",
                      top: -8,
                      left: tabWidth * key,
                      width: tabWidth,
                      height: 64,
                      justifyContent: "center",
                      alignItems: "center",
                      opacity: tabsSA[key].opacityReverse,
                      transform: [{ translateY: tabsSA[key].translateY }],
                      zIndex: 5,
                    }}
                  >
                    <View style={styles.activeIcon}>
                      <FontAwesomeIcon icon={ tab.item } color="black" size={25} />
                    </View>
                  </Animated.View>
                </React.Fragment>
              );
            })
          }
        </View>
    )
}
const TabBar = () => {

    return (
          <View style={ tabBarStyles.container }>
              <View style={ tabBarStyles.dummyPusher } />
              <Bar />
        </View>
    )
}

export default TabBar