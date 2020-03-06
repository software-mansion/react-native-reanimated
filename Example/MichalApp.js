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
    const parentWidth = useSharedValue(0);
    const parentHeight = useSharedValue(0);
    const first = useSharedValue(1);

    const ruszable = useWorklet(function(velocityX, velocityY, totalX, totalY, parentHeight, parentWidth){
        'worklet';
        const cords = [{velocity: velocityX, total: totalX, dim: parentWidth}, {velocity: velocityY, total: totalY, dim: parentHeight}];
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
    const worklet = useEventWorklet(function(x, y, prevX, prevY, totalX, totalY, ruszable, velocityX, velocityY, first) {
        'worklet';
        if (first.value) {
            prevX.set(totalX.value);
            prevY.set(totalY.value);
            first.set(0);
        }
        x.set(this.event.translationX);
        y.set(this.event.translationY);
        totalX.set(x.value + prevX.value);
        totalY.set(y.value + prevY.value);
        if (this.event.state === 5) {
            first.set(1);
            velocityX.set(this.event.velocityX)
            velocityY.set(this.event.velocityY)
            this.notify();
            this.start(ruszable)
        }
        
    }, [x, y, prevX, prevY, totalX, totalY, ruszable, velocityX, velocityY, first])

    return (
        <View style={{flex:1}} onLayout={(e) => {parentHeight.set(e.nativeEvent.layout.height); parentWidth.set(e.nativeEvent.layout.width);}}>
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