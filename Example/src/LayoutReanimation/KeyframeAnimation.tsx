import React, { useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import Animated, { AnimatedLayout, Keyframe, processColor } from 'react-native-reanimated';


export function KeyframeAnimation(): React.ReactElement {
    const [show, setShow] = useState(false);
    const enteringAnimation = new Keyframe({
        0: {
            originX: 50,
            transform: [{scale: 0.4}, {rotate: '45deg'}]
            
        },
        30: {
            originX: 10,
            transform: [{scale: 1.5},{rotate: '-90deg'}]
        },
        100: {
            originX: 0,
            transform: [{scale: 1}, {rotate: '0deg'}]
        }
    }).duration(2000);
    const exitingAnimation = new Keyframe({
        0: {
            backgroundColor: processColor('blue'),
            transform: [{skewX: '0deg'}]
            
        },
        30: {
            backgroundColor: processColor('orange'),
            transform: [{skewX: '40deg'}]
        },
        100: {
            backgroundColor: processColor('yellow'),
            transform: [{skewX: '-10deg'}]
        }
    }).duration(2000);
    return (
        <View style={{flexDirection: 'column-reverse'}}>
            
                <Button title="animate" onPress={() => {setShow((last) => !last)}}/>
                <View style={{height: 400, alignItems: 'center', justifyContent: 'center'}}>
                    {show &&  <AnimatedLayout>
                        <Animated.View 
                            entering={enteringAnimation} 
                            exiting={exitingAnimation} 
                            style={styles.animatedView} 
                        >
                        </Animated.View>
                    </AnimatedLayout>}
                </View>
            
        </View>
    );
}

const styles = StyleSheet.create({
    animatedView: {
        height: 100,
        width: 200,
        backgroundColor: 'blue',
        alignItems: 'center',
        justifyContent: 'center',
    }
});