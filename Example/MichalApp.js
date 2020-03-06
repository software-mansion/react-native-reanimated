import React from 'react';
import { Text, View } from "react-native"
import Animated, { useSharedValue, useWorklet, useEventWorklet } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

function MichalApp() {

    const x = useSharedValue(0);
    const y = useSharedValue(0);
    const prevX = useSharedValue(0);
    const prevY = useSharedValue(0);
    const totalX = useSharedValue(0);
    const totalY = useSharedValue(0);
    const velocityX = useSharedValue(0);
    const velocityY = useSharedValue(0);
    const ruszable = useWorklet(function(velocityX, velocityY, totalX, totalY){
        'worklet';
        const cords = [{velocity: velocityX, total: totalX}, {velocity: velocityY, total: totalY}];
        for (const cord of cords) {
            const {velocity, total} = cord;
            if (Math.abs(velocity.value) > 0.01) {
                total.set(total.value + velocity.value / 60);
                velocity.set(velocity.value * 0.99);
            }
        }
        
        if (Math.abs(velocityX.value) < 0.01 && Math.abs(velocityY.value) < 0.01) {
            return true
        }
    }, [velocityX, velocityY, totalX, totalY]);
    const worklet = useEventWorklet(function(x, y, prevX, prevY, totalX, totalY, ruszable, velocityX, velocityY) {
        'worklet';
        if (this.event.state === 2) {
            this.stop(ruszable)
        }
        x.set(this.event.translationX);
        y.set(this.event.translationY);
        totalX.set(x.value + prevX.value);
        totalY.set(y.value + prevY.value);
        if (this.event.state === 5) {
            prevX.set(totalX.value)
            prevY.set(totalY.value)
            x.set(0)
            y.set(0)
            if (this.start(ruszable)) {
                velocityX.set(this.event.velocityX)
                velocityY.set(this.event.velocityY)
            }
        }
        
    }, [x, y, prevX, prevY, totalX, totalY, ruszable, velocityX, velocityY])
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