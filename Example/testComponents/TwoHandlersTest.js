import React from 'react';
import { Text, View, Dimensions } from "react-native"
import Animated, { useSharedValue, useWorklet, useEventWorklet, Worklet } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

const panWorkletBody = new Worklet(function(prev, total, velocity, cord, ruszable) { // fix
    'worklet';
    const a = this.event['translation' + cord.value];
    if (this.event.state === 2) {
        prev.set(total.value);
        ruszable.stop();
    }

    total.set(prev.value + a);

    if (this.event.state === 5) {
        velocity.set(this.event['velocity' + cord.value]);
        ruszable.start();
        console.log("wystartowal ruszable " + cord.value);
    }
});

const ruszableWorklet = new Worklet(function(velocity, total, dim) {
    'worklet';
    if (Math.abs(velocity.value) > 0.05) {
        total.set(total.value + velocity.value / 60);
        velocity.set(velocity.value * 0.99);
    }

    if (total.value < 0 || (total.value + 40) > dim.value) {
        velocity.set(-velocity.value);

        if (total.value < 0) {
            total.set(-total.value);
        } else {
            const excess = total.value + 40 - dim.value;
            total.set(total.value - 2 * excess);
        }
    }

    if (Math.abs(velocity.value) <= 0.05 ) {
        return true;
    }
});

const TwoHandlersTest = () => {
    const prevX = useSharedValue(0)
    const prevY = useSharedValue(0)
    const totalX = useSharedValue(0)
    const totalY = useSharedValue(0)
    const velocityX = useSharedValue(0)
    const velocityY = useSharedValue(0)
    const X = useSharedValue('X');
    const Y = useSharedValue('Y');
    const dimX = useSharedValue(100);
    const dimY = useSharedValue(100);

    const ruszableX = useWorklet(ruszableWorklet, [velocityX, totalX, dimX]); 
    const ruszableY = useWorklet(ruszableWorklet, [velocityY, totalY, dimY]);

    const xCordAnimation = useEventWorklet(panWorkletBody, [prevX, totalX, velocityX, X, ruszableX]);
    const yCordAnimation = useEventWorklet(panWorkletBody, [prevY, totalY, velocityY, Y, ruszableY]);

    return (
        <View style={{flex:1}} onLayout={(e) => {dimX.set(e.nativeEvent.layout.width); dimY.set(e.nativeEvent.layout.height);}}>
            <PanGestureHandler
                onGestureEvent={[xCordAnimation, yCordAnimation]}
                onHandlerStateChange={[xCordAnimation, yCordAnimation]}
            >
                <Animated.View
                    style={[{
                        width: 40,
                        height: 40,
                        transform: [{
                            translateX: totalX,
                        },
                        {
                            translateY: totalY,
                        }]
                    },
                    {
                        backgroundColor: 'black',    
                    }]
                }
                />
            </PanGestureHandler>
        </View>
    )
}

export default TwoHandlersTest