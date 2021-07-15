import React from 'react';
import {  } from 'react-native';
import Animated, { AnimatedLayout, withTiming } from 'react-native-reanimated';

export function StateChanges() {

    return (
        <AnimatedLayout>
            <A/>
            <B/>
        </AnimatedLayout>
    );
}

function A() {
    return (
        <Animated.View>

        </Animated.View>
    );
}

function B() {
    return (
        <Animated.View>
            <Animated.View 
                initialStyle={{originX: -width, opacity: 0}}
                style={{opacity: 1}}
                transtion={{opacity: (x) => withSpring(x)}} 
                exitStyle={{
                    opacity: withTiming(10, {duration: 1000})},
                }}
            />
        </Animated.View>
    );
}