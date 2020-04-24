import React from 'react';
import Animated, { useSharedValue, useEventWorklet, useSpring } from 'react-native-reanimated';
import { View, Dimensions, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faCoffee, faTrash, faUser, faList, faReply } from '@fortawesome/free-solid-svg-icons'
import { TapGestureHandler } from 'react-native-gesture-handler';

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
      zIndex: 2,
      backgroundColor: 'white',
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
    upperFollower: {
      backgroundColor: 'orange',
      width: tabWidth + 20,
      height: 20,
      left: -10,
      position: 'absolute',
      zIndex: 4,
    },
    lowerFollower: {
      borderRadius: 500,
      backgroundColor: 'orange',
      width: tabWidth,
      height: tabWidth,
      position: 'absolute',
      top: -tabWidth/3.5,
      left: 0,
      zIndex: 3,
    },
    littleFollower: {
      backgroundColor: 'white',
      borderRadius: 500,
      width: 20,
      height: 25,
      position: 'absolute',
      top: 0,
      zIndex: 4,
    },
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

    const spring = useSpring({},{});

    const opWorklet = useEventWorklet(function(input) {
      'worklet'
      if (this.event.state !== 2) {
          return true
      }
      const index = Math.floor(this.event.absoluteX / input.tabWidthSV.value)
      if (index !== input.activeIndex.value && input.newIndex.value === -1) {
        input.newIndex.set(index)

        this.log('[event worklet] index switch: ' + input.activeIndex.value + ' -> ' + index)
        const newFollowerDest = index * input.tabWidthSV.value
        input.followerPosition.set(Reanimated.withWorkletCopy(input.spring.worklet, [{}, {
          toValue: newFollowerDest,
          damping: 100,
        }]));
            

        // move down item that's being deactivated
        input.tabsSA[input.activeIndex.value].translateY.set(Reanimated.withWorkletCopy(input.spring.worklet, [
          {},
          { toValue: input.values.translateY.max.value }
        ]))

        // move down item that's being activated
        input.tabsSA[input.newIndex.value].translateY.set(Reanimated.withWorkletCopy(input.spring.worklet, [
          {},
          { toValue: input.values.translateY.min.value }
        ]))

        // make visible item that's being activated
        input.tabsSA[input.newIndex.value].opacity.set(Reanimated.withWorkletCopy(input.spring.worklet, [
          {},
          { toValue: input.values.opacity.min.value }
        ]))
        input.tabsSA[input.newIndex.value].opacityReverse.set(Reanimated.withWorkletCopy(input.spring.worklet, [
          {},
          { toValue: input.values.opacity.max.value }
        ]))

        // make invisible item that's being deactivated
        input.tabsSA[input.activeIndex.value].opacity.set(Reanimated.withWorkletCopy(input.spring.worklet, [
          {},
          { toValue: input.values.opacity.max.value }
        ]))
        input.tabsSA[input.activeIndex.value].opacityReverse.set(Reanimated.withWorkletCopy(input.spring.worklet, [
          {},
          { toValue: input.values.opacity.min.value }
        ]))


        input.activeIndex.set(index)
        input.newIndex.set(-1)
      }

    }, { tabWidthSV, tabsSA, activeIndex, tabHeightSV, values, newIndex, spring, followerPosition })
    
    return (
        <View style={styles.container}>
        <Animated.View style={ { ...styles.followerWrapper, left: followerPosition, } }>
            <View style={ styles.lowerFollower } />
            <View style={ styles.upperFollower } />
            <View style={ [ styles.littleFollower, { left: tabWidth, } ] } />
            <View style={ [ styles.littleFollower, { left: -20, } ] } />
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
                            opacity: tabsSA[key].opacity,
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

const TabBar = () => {

    return (
          <View style={ tabBarStyles.container }>
              <View style={ tabBarStyles.dummyPusher } />
              <Bar />
        </View>
    )
}

export default TabBar