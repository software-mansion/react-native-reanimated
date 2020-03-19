import React from 'react';
import Animated, { useSharedValue, useWorklet } from 'react-native-reanimated';
import { View } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';

const SharedFunctionTest = () => {
    
    const isStarted = useSharedValue(0);
    const state = useSharedValue({startTime: 0, isStarted});
    
    const zero = useSharedValue(0); // only for test
    const heights = useSharedValue([0, 0, 0, zero]);
    const duration = useSharedValue(5000);
    
    const worklet = useWorklet(function(state, heights, duration) {
        'worklet';
        const { isStarted, startTime } = state;

        this.log("state id: " + state.id.toString() + " arrayId: " + heights.id.toString());

        const now = Date.now();
        if (isStarted.value === 0) {
            isStarted.set(1);
            startTime.set(now);
        }

        const deltaTime = now - startTime.value;
        const progress = deltaTime / duration.value;

        if (deltaTime > duration.value) {
            return true;
        }

        for (let height of heights) {
            height.set(progress * 200);
        }
        
    }, [state, heights, duration]);

    const views = [];

    for (let i = 0; i < 4; ++i) {
        views.push(
            <Animated.View
                key={i}
                style={{
                    margin: 10,
                    width: 100,
                    height: heights[i],
                    backgroundColor: 'green',
                }}
            />
        );
    } 

    worklet();

    return (
        <View style={{flex: 1, flexDirection: "row"}}>
            {views}
        </View>
    )
}

export default SharedFunctionTest;