import React from 'react';
import Animated, { useSharedValue, useWorklet, RegistersState } from 'react-native-reanimated';
import { View, Text } from 'react-native';

const workletBody = function(a, b, c) {
    'worklet'
    this.log(`worklet called ${ a.value }/${ b.value }/${ c.value }`)
    c.set(a.value + b.value + c.value)
    const oldB = b.value
    b.set(a.value + b.value)
    a.set(oldB)
    return true
}
/*
const eventWorkletBody = function(a, b) {
    'worklet'
    if (this.event.state === 2) {
        a.set(this.event.translationX)
        b.set(this.event.translationY)
        return true
    }
}
*/

const Child = (props) => {

    let flag = false;
    const n = 5;
    let svs = []
    let worklets = []
    let eventWorklets = []

    const toBeTested = [
        'sharedValues',
        //'worklets',
        //'eventWorklets',
    ]

    ;(() => {
        if (flag) return
        flag = true
        if (toBeTested.includes('sharedValues')) {
            for (var i = 0; i < n; ++i) {
                svs.push(useSharedValue((props.id+1)*(i+1)))
            }
        }

        if (toBeTested.includes('worklets')) {
            const startingIndex = Math.min(i, n - 3)
            for (var i = 0; i < n; ++i) {
                worklets.push(useWorklet(workletBody, [
                    svs[startingIndex].sharedValue,
                    svs[startingIndex + 1].sharedValue,
                    svs[startingIndex + 2].sharedValue,
                ]));
            }
        }

        if (toBeTested.includes('eventWorklets')) {
            const eStartingIndex = Math.min(i, n - 2)
            eventWorklets.push(useEventWorklet(eventWorkletBody, [
                svs[eStartingIndex],
                svs[eStartingIndex + 1],
            ]))
        }

        for (let worklet of worklets) {
            worklet();
        }
        
    })();

    /*
    const generateHandlers = function(eventWorklet) {
        return (
            <PanGestureHandler
                onHandlerStateChange={eventWorklet}
                onGestureEvent={eventWorklet}
            >
                <Animated.View
                    style={{
                        width: 100,
                        height: 100,
                        backgroundColor: 'blue',
                        margin: 5,
                    }}
                />
            </PanGestureHandler>
        )
    }
    */
    return (
        <View>
            <Text>{ props.id }</Text>
        </View>
    )
}

const cleanupPhase = {
    'rendering': 1,
    'hidding': 2,
    'checking': 3,
    'checked': 4,
}

class Wrapper extends React.Component {

    constructor(props) {
        super(props)

        this.state = {
            cr: -1,
            cleanupPhase: cleanupPhase.rendering,
        }

        this.initialState = {
            obtained: false,
            workletIds: [],
            svIds: [],
            appliersIds: [],
        }
        this.finalState = {
            obtained: false,
            workletIds: [],
            svIds: [],
            appliersIds: [],
        }

        this.currentKey = 0
    }

    componentDidMount() {
        (async () => {
            await this.obtainState(this.initialState)

            this.interval = setInterval(() => {
                this.obtainState(this.finalState)
                this.finalState.obtained = false
                this.setState({ cr: this.state.cr + 1 })
                if (this.state.cr > this.props.components.length) {
                    clearInterval(this.interval)
                    this.setState({ cleanupPhase: cleanupPhase.hidding })
                }
            }, 700)
        })()
    }

    obtainState = async (stateObject) => {
        if (stateObject.obtained) {
            return
        }
        stateObject.obtained = true
        try {
            let ids = await RegistersState.getRegisteredSharedValuesIds();
            stateObject.svIds = ids.split(' ')

            ids = await RegistersState.getRegisteredWorkletsIds();
            stateObject.workletIds = ids.split(' ')

            ids = await RegistersState.getRegisteredAppliersIds();
            stateObject.appliersIds = ids.split(' ')
        } catch(e) {
            console.warn(`obtain state rejected: ${e}`)
        }
    }

    checkCleanup = async () => {
        if (this.state.cleanupPhase !== cleanupPhase.checking) {
            return
        }
        await this.obtainState(this.finalState)
        if (JSON.stringify(this.initialState) === JSON.stringify(this.finalState)) {
            console.log('cleanup successful')
            return
        }
        console.warn('cleanup failed')
        console.log(JSON.stringify(this.initialState))
        console.log(JSON.stringify(this.finalState))
        this.setState({ cleanupPhase: cleanupPhase.checked })
    }

    renderChildren = () => {
        if (!this.initialState.obtained || this.state.cleanupPhase !== cleanupPhase.rendering) {
            return <></>;
        }
        let cdn = []
        for (let i = 0; i < this.props.components.length; ++i) {
            let item = (i === this.state.cr) ? this.props.components[i] : <></>
            item = (<View key={ this.currentKey++ }>{ item }</View>)
            cdn.push(item)
        }
        return cdn.map(item => item)
    }

    componentDidUpdate() {
        if (this.state.cleanupPhase === cleanupPhase.hidding) {
            this.setState({ cleanupPhase: cleanupPhase.checking })
        }
    }

    render() {
        if (this.state.cleanupPhase === cleanupPhase.checking) {
            this.checkCleanup()
        }
        return (
            <View>
                { this.renderChildren() }
            </View>
        )
    }
}

const CleanUpTest = () => {
    return (
        <>
            <Wrapper components={ [
                <Child id={ 2 } />,
                <Child id={ 4 } />,
                <Child id={ 9 } />,
                <Child id={ 12 } />,
                <Child id={ 23 } />,
            ] } />
        </>
    )
}

export default CleanUpTest