import React from 'react';
import { Text } from 'react-native';
/*
const panWorkletBody = new Worklet(function(a, prev, total, velocity, cord, numberOfFinished, ruszable) {
    'worklet';
    a.set(this.event['translation' + cord.value]);
    if (this.event.state === 5) {
        prev.set(a.value);
        a.set(0);
        velocity.set(this.event['velocity' + cord.value]);
        numberOfFinished.set(numberOfFinished.value + 1);
        if (numberOfFinished.value === 2) {
            ruszable.start();
            numberOfFinished.set(0);
        }
    }
    total.set(a.value + prev.value);
});
*/
const TwoHandlersTest = () => {

    return <Text>MichalAppTwoHandlers works</Text>
/*
    const x = useSharedValue(0)
    const y = useSharedValue(0)
    const prevX = useSharedValue(0)
    const prevY = useSharedValue(0)
    const totalX = useSharedValue(0)
    const totalY = useSharedValue(0)
    const velocityX = useSharedValue(0)
    const velocityY = useSharedValue(0)
    const X = useSharedValue('X');
    const Y = useSharedValue('Y');
    const numberOfFinished = useSharedValue(0);

    const ruszable = useWorklet(function(velocityX, velocityY, totalX, totalY) {
        'worklet';
        const cords = [{velocity: velocityX, total: totalX}, {velocity: velocityY, total: totalY}];
        for (const cord of cords) {
            const {velocity, total} = cord;
            if (velocity.value > 0.01) {
                total.set(total.value + velocity.value / 60);
                velocity.set(velocity.value * 0.99);
            }
        }
        
        if (velocityX.value <= 0.01 && velocityY.value <= 0.01) {
            return true
        }
    }, [velocityX, velocityY, totalX, totalY]);

    const xCordAnimation = useEventWorklet(panWorkletBody, [x, prevX, totalX, velocityX, X, numberOfFinished, ruszable]);
    const yCordAnimation = useEventWorklet(panWorkletBody, [y, prevY, totalY, velocityY, Y, numberOfFinished, ruszable]);

    return (
        <View style={style.sth}>
            <PanGestureHandler
                onGestureEvent={[xCordAnimation, yCordAnimation]}
                onHandlerStateChange={[xCordAnimation, yCordAnimation]}
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
                        }]
                    }}
                />
            </PanGestureHandler>
        </View>
    )
    */
}

export default TwoHandlersTest