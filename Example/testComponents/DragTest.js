import React from 'react';
import { Text, View, Dimensions } from "react-native"
import Animated, { useSharedValue, useWorklet, useEventWorklet } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import ReanimatedModule from '../../src/ReanimatedModule';

function DragTest() {
    const totalX = useSharedValue(0);
    const totalY = useSharedValue(0);
    const parentWidth = useSharedValue(Dimensions.get('window').width);
    const parentHeight = useSharedValue(Dimensions.get('window').height);

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

        if (Math.abs(velocityX.value) < 0.01 && Math.abs(velocityY.value) < 0.1) {
            return true
        }
    }, [0, 0, totalX, totalY, parentHeight, parentWidth]);

    const worklet = useEventWorklet(function(totalX, totalY, ruszable) {
        'worklet';
        console.log("przed memory");
        const memory = Reanimated.memory(this);
        console.log("po memory");
        if (this.event.state === 2) {
            memory.prevX = totalX.value;
            memory.prevY = totalY.value;
            ruszable.stop();
        }

        totalX.set(this.event.translationX + memory.prevX);
        totalY.set(this.event.translationY + memory.prevY);
        if (this.event.state === 5) {
            ruszable.start(this.event.velocityX, this.event.velocityY);
        }
        
    }, [totalX, totalY, ruszable]);

    return (
        <View style={{flex:1}} onLayout={(e)=>{parentHeight.set(e.nativeEvent.layout.height); parentWidth.set(e.nativeEvent.layout.width);}}>
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

export default DragTest