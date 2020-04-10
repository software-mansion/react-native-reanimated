import React from 'react';
import { Text, View } from "react-native"
import { useSharedValue, useWorklet, useEventWorklet, install } from 'react-native-reanimated';

const FunctionInstall = () => {
    const sv = useSharedValue(33)
    const sa = useSharedValue([1,2,3, { r: 88, f: 'uuu' }, ['a','b',6,7,8, sv]])
    const so = useSharedValue({ o: { a: { d: { u: ['a', 456]}}}, x: 6, d: 12, arr: sa, plainarr: [5,6,7,8], strarr:['a','b','sdfsdf']})

    ;(useWorklet(function(sv, so, sa) {
        'worklet'
        console.log('[worklet] testing assign')
        // todo write test for assign
        return true
    }, [sv, so, sa]))();

    ;(useWorklet(function(sv, so, sa) {
        'worklet'
        console.log('[worklet] testing withWorklet')
        // todo write test for withWorklet
        return true
    }, [sv, so, sa]))();

    ;(useWorklet(function(sv, so, sa) {
        'worklet'
        console.log('[worklet] testing memory')
        // todo write test for memory
        return true
    }, [sv, so, sa]))();

    ;(useWorklet(function(sv, so, sa) {
        'worklet'
        console.log('[worklet] testing console.log')
        console.log(sv)
        console.log(so)
        console.log(sa)
        return true
    }, [sv, so, sa]))();

    // test custom functions installation
    install('hello', function(name) {
        console.log('inside hello')
        return `hello ${ name }`
    });

    install('validateAge', function(name, age) {
        console.log('inside validate age')
        label = (age > 50) ? 'old' : 'young';
        return `${ Reanimated.hello(name) }, you are ${ label }`
    })

    ;(useWorklet(function(sv, so, sa) {
        'worklet'
        console.log('[worklet] testing custom functions')
        console.log(Reanimated.hello('john'))
        console.log(Reanimated.validateAge('samantha', 65))
        return true
    }, [sv, so, sa]))();

    return (
        <View>
            <Text>Testing function install...</Text>
        </View>
    )
}

export default FunctionInstall