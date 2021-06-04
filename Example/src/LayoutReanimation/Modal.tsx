import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, AnimatedLayout, withTiming } from 'react-native-reanimated';

function AnimatedView() {

    const style = useAnimatedStyle(() => {
        return {}
    });

    const entering = (targetValues) => {
        'worklet';

        return {
            initialValues:{
                transform: [
                    { translateY: targetValues.height/2 },
                    { perspective: 500 },
                    { rotateX: '90deg'},
                    { translateY: -targetValues.height/2 },
                    { translateY: 300 },
                ],
            },
            animations: {
                transform: [
                    { translateY: withTiming(targetValues.height/2) },
                    { perspective: withTiming(500) },
                    { rotateX: withTiming('0deg')},
                    { translateY: withTiming(-targetValues.height/2) },
                    { translateY: withTiming(0) },
                ],
            }
        }
    }

    const exiting = (targetValues) => {
        'worklet';

        return {
            initialValues:{},
            animations: {
                transform: [
                    { translateY: withTiming(targetValues.height/2) },
                    { perspective: withTiming(500) },
                    { rotateX: withTiming('90deg')},
                    { translateY: withTiming(-targetValues.height/2) },
                    { translateY: withTiming(300) },
                ],
            }
        }
    }

    return (
        <AnimatedLayout>
            <Animated.View {...{entering, exiting}} style={[styles.animatedView, style]} >
                <Text> kk </Text>
            </Animated.View>
        </AnimatedLayout>
    );
}

export function Modal(): React.ReactElement {
    const [show, setShow] = useState(false);
    return (
        <View style={{flexDirection: 'column-reverse'}}>
            <Button title="toggle" onPress={() => {setShow((last) => !last)}}/>
            <View style={{height: 400, alignItems: 'center', justifyContent: 'center', borderWidth: 1}}>
                {show && <AnimatedView />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    animatedView: {
        height: 300,
        width: 200,
        borderWidth: 1,
        borderColor: 'black',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: "red",
    },
});