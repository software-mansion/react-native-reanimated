import React from 'react';
import Animated, { useSharedValue, useEventWorklet, useSpring, useMapper } from 'react-native-reanimated';
import { View, Dimensions, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faCoffee, faTrash, faUser, faList, faReply } from '@fortawesome/free-solid-svg-icons'
import { TapGestureHandler } from 'react-native-gesture-handler';
import Svg, { Path } from "react-native-svg";

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
  });

const AnimatedPath = Animated.createAnimatedComponent(Path);

const Bar = () => {
    const tabWidthSV = useSharedValue(tabWidth)
    const widthSV = useSharedValue(width)
    const tabHeightSV = useSharedValue(tabHeight)
    
    const activeIndex = useSharedValue(0)
    const followerPosition = useSharedValue(-width + tabWidth/2)
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
      },
      translateY: {
        min: 0,
        max: 64,
      },
    }

    const commands = useSharedValue('');
    const mapper = useMapper(
      function(input, output) {
        'worklet';
        
        const { width, tabWidth, tabHeight } = input;
        const height = 30//tabHeight.value

        // todo replace pos with current tab position
        const curveWidth = width.value * 2
        const pos = curveWidth / 2 - tabWidth.value/2;
        const left = `
          M${ 0 } ${ 0 }
          L${ 0 } ${ height }
        `;

        const bezierCurves = `
          C
          ${ pos } ${ height }
          ${ pos + 10 } ${ height }
          ${ pos + 10 } ${ height + 20 }
          C
          ${ pos + 10 } ${ height + 20 }
          ${ pos + 10} ${ height + 60 }
          ${ pos + tabWidth.value/2 } ${ height + 60 }
          C
          ${ pos + tabWidth.value/2 } ${ height + 60 }
          ${ pos + tabWidth.value - 10 } ${ height + 60 }
          ${ pos + tabWidth.value - 10 } ${ height + 20 }
          C
          ${ pos + tabWidth.value - 10 } ${ height + 20 }
          ${ pos + tabWidth.value - 10 } ${ height }
          ${ curveWidth - 350 } ${ height }
        `;

        const right = `
          L${ curveWidth } ${ 0 }
          L${ 0 } ${ 0 }
        `;

        output.commands.set(`${ left } ${ bezierCurves } ${ right }`);
      }, [{ width, tabWidth, tabHeight }, { commands }]
    );
    mapper();

    const spring = useSpring({},{});

    const opWorklet = useEventWorklet(function(input) {
      'worklet'
      if (this.event.state !== 2) {
          return false
      }
      const index = Math.floor(this.event.absoluteX / input.tabWidthSV.value)
      if (index !== input.activeIndex.value && input.newIndex.value === -1) {
        input.newIndex.set(index)

        this.log('[event worklet] index switch: ' + input.activeIndex.value + ' -> ' + index)
        const newFollowerDest = (-input.widthSV.value + input.tabWidthSV.value / 2) + index * input.tabWidthSV.value
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

    }, { tabWidthSV, tabsSA, activeIndex, tabHeightSV, values, newIndex, spring, followerPosition, widthSV })
    
    return (
        <View style={styles.container}>
          <Svg {...{ width: width * 2, height: 100, position: 'absolute', bottom: 0, zIndex: 3 }}>
            <AnimatedPath d={commands} fill="red" style={ { transform: [{
              translateX: followerPosition,
            }] } } />
          </Svg>
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
  container: {
    width,
    height,
    flex: 1,
    backgroundColor: 'red',
  },
  dummyPusher: {
      flex: 1,
  },
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