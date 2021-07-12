import React, { useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import Animated, { AnimatedLayout, SlideOutRight, Keyframe } from 'react-native-reanimated';


export function KeyframeAnimation(): React.ReactElement {
    const [show, setShow] = useState(false);
    return (
        <View style={{flexDirection: 'column-reverse'}}>
            
                <Button title="animate" onPress={() => {setShow((last) => !last)}}/>
                <View style={{height: 400, alignItems: 'center', justifyContent: 'center'}}>
                    {show &&  <AnimatedLayout>
                        <Animated.View 
                            entering={new Keyframe({
                                0: {
                                    originX: 50,
                                    // transform: [
                                    //     {scale: 0}
                                    // ]
                                    
                                },
                                30: {
                                    originX: 10,
                                    // transform: [{scale: 2}]
                                },
                                100: {
                                    originX: 0,
                                    // transform: [{scale: 1}]
                                }
                            })} 
                            exiting={SlideOutRight} 
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