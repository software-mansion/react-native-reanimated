import React from 'react';
import { View, Dimensions } from 'react-native';
import { useEffect } from 'react';
import Animated, { Worklet, useSharedValue, useWorklet } from 'react-native-reanimated';

const workletBody = new Worklet(function(startTime, started, width, maxWidth, duration) {
    'worklet';
    if (started.value === 0) {
        startTime.set(Date.now());
        started.set(1);
    }
    const delta = Date.now() - startTime.value;
    
    if (delta > duration.value) {
        return true;
    }
    width.set(delta / duration.value * maxWidth.value);
});

const SpeedTest = () => {
    const worklets = [];
    const numberOfSquares = 100;
    const width = useSharedValue(0);

    let currKey = 0
    const createAnimatedSquare = (height) => {
        return (
            <Animated.View
                style={{
                    width: width,
                    height: height,
                    backgroundColor: "black",
                    marginBottom: 1,
                }}
            />
        )
    };

    let squares = []
    const maxWidth = useSharedValue(Dimensions.get('window').width * .95)
    const duration = useSharedValue(1200)

    for (var i = 0; i < numberOfSquares; ++i) {
        const startTime = useSharedValue(0);
        const started = useSharedValue(0);

        worklets.push(useWorklet(workletBody, [startTime, started, width, maxWidth, duration]));
        squares.push(createAnimatedSquare(Dimensions.get('window').height / (numberOfSquares*1.5)))
    }

    useEffect(()=>{
        for (let worklet of worklets) {
            worklet();
        }
    }, []);

    return (
        <View style={ {flex: 1, flexDirection:'column'} } >
            { squares.map(item => <View key={currKey++}>{ item }</View>) }
        </View>
    )
}

export default SpeedTest