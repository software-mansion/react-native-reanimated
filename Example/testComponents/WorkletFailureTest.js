import React from 'react';
import Animated, { useSharedValue, useWorklet, useEventWorklet } from 'react-native-reanimated';
import { View, Text } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';

// just show the error box on worklet failure
const SingleWorkletTest = () => {
    // this worklet should simply fire an error
    (useWorklet(function() {
        'worklet'
        xxx.set(5)
    }, []))();

    return (
        <View>
            <Text>
                test single worklet
            </Text>
        </View>
    )
}

// prevent running worklets after at least one fails
const preventMultipleWorklets = () => {

    ;(useWorklet(function() {
        'worklet'
        this.log('[worklet 1]')
        xxx.set(5)
    }, []))();
    // below worklet should not be called anymore once above worklet fires an error
    ;(useWorklet(function() {
        'worklet'
        this.log('[worklet 2]')
    }, []))();

    return (
        <View>
            <Text>
                test multiple worklets
            </Text>
        </View>
    )
}

// fail event worklet
const EventWorkletTest = () => {
    // first event should cause an error in the worklet below
    const worklet = useEventWorklet(function() {
        'worklet'
        this.log('[event worklet] ' + this.event.state)
        asdasd.set(8)
    }, [])

    return (
        <View>
            <PanGestureHandler
                onGestureEvent={worklet}
                onHandlerStateChange={worklet}
            >
                <Animated.View
                    style={{
                        width: 200,
                        height: 200,
                        backgroundColor: 'black',
                    }}
                />
            </PanGestureHandler>
        </View>
    )
}

// check prevent starting after event worklet fails
const PreventMultipleEventWorklets = () => {
    const worklet = useEventWorklet(function() {
        'worklet'
        this.log('[event worklet] ' + this.event.state)
        asdasd.set(8)
    }, [])
    // the loop worklet below should stop being called once an error from above event worklet is triggered
    ;(useWorklet(function() {
        'worklet'
        this.log('[regular worklet loop]')
    }, []))();

    return (
        <View>
            <PanGestureHandler
                onGestureEvent={worklet}
                onHandlerStateChange={worklet}
            >
                <Animated.View
                    style={{
                        width: 200,
                        height: 200,
                        backgroundColor: 'black',
                    }}
                />
            </PanGestureHandler>
        </View>
    )
}

const WorkletFailureTest = () => {

    return (
        <View>
            { /* just load one of above test components */ }
            <PreventMultipleEventWorklets />
        </View>
    )
}

export default WorkletFailureTest