import React from 'react';
import Animated, { useSharedValue, useEventWorklet } from 'react-native-reanimated';
import { View } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';

const MichalAppNotify = () => {
/*
    const x = useSharedValue(0)
    const y = useSharedValue(0)
    const prevX = useSharedValue(0)
    const prevY = useSharedValue(0)
    const totalX = useSharedValue(0)
    const totalY = useSharedValue(0)
    const velocityX = useSharedValue(0)
    const velocityY = useSharedValue(0)
    const tab = [x, y, prevX, prevY, totalX, totalY, velocityX, velocityY];
    const worklet = useEventWorklet(function(x, y, prevX, prevY, totalX, totalY, velocityX, velocityY) {
        'worklet';
        x.set(this.event.translationX);
        y.set(this.event.translationY);
        if (this.event.state === 5) {
            prevX.set(x.value)
            prevY.set(y.value)
            x.set(0)
            y.set(0)
            velocityX.set(this.event.velocityX)
            velocityY.set(this.event.velocityY)
            this.notify();
        }
        totalX.set(x.value + prevX.value)
        totalY.set(y.value + prevY.value)
    }, [x, y, prevX, prevY, totalX, totalY, velocityX, velocityY]);
    worklet.setListener(() => {
        console.warn("reset from listener");
        for (const variable of tab) {
            variable.set(0);
        }
    });*/

    const x = useSharedValue(0)
    const y = useSharedValue(0)
    const worklet = useEventWorklet(function(x, y) {
        'worklet'
        console.log(`worklet: ${this.event.translationX}`)
        x.set(this.event.translationX)
        y.set(this.event.translationY)
        if (this.event.state === 5) {
            this.notify()
        }
    }, [x.sharedValue, y.sharedValue])
    worklet.setListener(() => {
        console.log('from listener')
        x.set(0)
        y.set(0)
    })

    return (
        <View style={{}}>
            <PanGestureHandler
                onHandlerStateChange={worklet}
                onGestureEvent={worklet}
            >
                <Animated.View
                    style={{
                        width: 100,
                        height: 100,
                        backgroundColor: 'green',
                        transform: [{
                            translateX: x
                        },
                        {
                            translateY: y
                        }]
                    }}
                />
            </PanGestureHandler>
        </View>
    )
}

export default MichalAppNotify