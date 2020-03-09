import React from 'react';
import Animated, { useSharedValue, useEventWorklet } from 'react-native-reanimated';
import { View } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';

const NotifyTest = () => {
    
    const prevX = useSharedValue(0)
    const prevY = useSharedValue(0)
    const totalX = useSharedValue(0)
    const totalY = useSharedValue(0)
    
    const worklet = useEventWorklet(function(prevX, prevY, totalX, totalY) {
        'worklet';
        if (this.event.state === 2) {
            prevX.set(totalX.value)
            prevY.set(totalY.value)
        }
        totalX.set(this.event.translationX + prevX.value);
        totalY.set(this.event.translationY + prevY.value);
        if (this.event.state === 5) {
            this.notify()
        }
        
    }, [prevX, prevY, totalX, totalY])

    worklet.setListener(async () => {
        const x = await totalX.get()
        const y = await totalY.get()
        if (x > 100 && y > 100) {
            totalX.set(0)
            totalY.set(0)
        }
    })

    return (
        <View>
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
                            translateX: totalX
                        },
                        {
                            translateY: totalY
                        }]
                    }}
                />
            </PanGestureHandler>
        </View>
    )
}

export default NotifyTest