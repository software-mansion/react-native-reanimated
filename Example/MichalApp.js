import React from 'react';
import { Text, View, Dimensions } from "react-native"
import Animated, { useSharedValue, useWorklet, useEventWorklet } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { getStatusBarHeight } from 'react-native-status-bar-height';

function MichalApp() {
    const prevX = useSharedValue(0);
    const prevY = useSharedValue(0);
    const totalX = useSharedValue(0);
    const totalY = useSharedValue(0);
    const velocityX = useSharedValue(0);
    const velocityY = useSharedValue(0);
    const parentWidth = useSharedValue(Dimensions.get('window').width);
    const parentHeight = useSharedValue(Dimensions.get('window').height - getStatusBarHeight(true));

    const ruszable = useWorklet(function(velocityX, velocityY, totalX, totalY, parentHeight, parentWidth) {
        'worklet';
        const cords = [
            {
                velocity: velocityX,
                total: totalX,
                dim: parentWidth,
            },
            {
                velocity: velocityY,
                total: totalY,
                dim: parentHeight,
            }
        ];
        for (const cord of cords) {
            const {velocity, total, dim} = cord;
            if (Math.abs(velocity.value) > 0.01) {
                total.set(total.value + velocity.value / 60);
                velocity.set(velocity.value * 0.99);

                if (total.value < 0) {
                    total.set(-total.value);
                    velocity.set(-velocity.value);
                }

                if (total.value + 40 > dim.value) {
                    const excess = total.value + 40 - dim.value;
                    total.set(total.value - 2*excess);
                    velocity.set(-velocity.value);
                }
            }
        }

        if (Math.abs(velocityX.value) < 0.01 && Math.abs(velocityY.value) < 0.01) {
            return true
        }
    }, [velocityX, velocityY, totalX, totalY, parentHeight, parentWidth]);
    const worklet = useEventWorklet(function(prevX, prevY, totalX, totalY, ruszable, velocityX, velocityY) {
        'worklet';
        if (this.event.state === 2) {
            prevX.set(totalX.value)
            prevY.set(totalY.value)
           // this.stop(ruszable)
        }
        totalX.set(this.event.translationX + prevX.value);
        totalY.set(this.event.translationY + prevY.value);
        if (this.event.state === 5) {
            velocityX.set(this.event.velocityX);
            velocityY.set(this.event.velocityY);
            this.start(ruszable);
        }
        
    }, [prevX, prevY, totalX, totalY, ruszable, velocityX, velocityY])
    return (
        <View style={{flex:1}}>
            <PanGestureHandler
                onGestureEvent={worklet}
                onHandlerStateChange={worklet}
            >
                <Animated.View
                    style={{
                        width: 40,
                        height: 40,
                        transform: [{
                            translateX: totalX
                        },
                        {
                            translateY: totalY
                        }],
                        backgroundColor: 'black',
                    }}
                />
            </PanGestureHandler>
        </View>
    )
}

export default MichalApp