import React, { useState } from 'react';
import { View, Button } from 'react-native';
import Animated, { AnimatedLayout, withTiming } from 'react-native-reanimated';

const Data = [
    'banana',
    'apple',
    'strawberry',
];

export default function NotificaitonExample() {
    const [notifications, setNotification] = useState<Array<string>>([]);

    const removeIndex = (i: number) => {
        notifications.splice(i, 1);
        setNotification(notifications);
    }

    return (
        <View>
            <View> <Notifications {...{notifications, removeIndex}}/> </View>
            <View> 
                <Button onPress={() => {
                    const randomOrder = Data.sort(() => Math.random() - 0.5);
                    notifications.push(randomOrder[0]);
                    setNotification(notifications);
                }} title="add" /> 
            </View>
        </View>
    );
}

function Notifications({notifications, removeIndex}: any) {
    return (
        <View>
            <AnimatedLayout>
                {notifications.map((notification: string, ind: number) => {
                    return (
                    <Animated.View key={notification} 
                        initialStyle={{ opacity: 0, transform:[{translateY: 50}, {scale: 0.5}] }} 
                        exitStyle={{ 
                            opacity: withTiming(0, {duration: 0.2}), 
                            scale: withTiming(0.5, {duration: 0.2}), 
                        }}
                    >
                        { notification }
                        <Button title="X" onPress={() => removeIndex(ind)}/>
                    </Animated.View>
                    );
                })}
            </AnimatedLayout>
        </View>
    );
}

// function mojAnimator(from, to) {
//     if (from.y > to.y) {
//         return {
//             x: withDelay(100, withTiming()),
//             y: withDelay
//         }
//     }
//     return {

//     }
// }

function  Notifications({notifications, removeIndex}: any) {
    const [opacity, setOopacity] = useState(0.6)

    const firstRun = useSharedValue(true);
    const secondRun = useSharedValue(true);
    const stylez = useAnimatedStyle(() => {
        if (firstRun.value) {
            firstRun.value = false;
            return {
                opacity: 0.5
            }
        } else if (secondRun.value) {
            secondRun.value = false;
            return {
                opacity: withTiming(1)
            }
        } else {
            return {
                opacity: withTiming(0.7)
            }
        }
    })

    return (
        <View>
            <AnimatedLayout>
                {notifications.map((notification: string, ind: number) => {
                    return (
                    <Animated.View 
                        key={notification} 
                        entering={}
                        exiting={}
                        layout={Layout}
                    >
                        { notification }
                        <Button title="X" onPress={() => removeIndex(ind)}/>
                    </Animated.View>
                    );
                })}
            </AnimatedLayout>
        </View>
    );
}
