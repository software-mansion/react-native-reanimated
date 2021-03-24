import { requireNativeComponent, findNodeHandle } from 'react-native';
import React from 'react';
import { runOnUI } from '../core';

const REALayoutView = requireNativeComponent('REALayoutView');

export class AnimatedRoot extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.sv = makeSherable(0);
    }

    componentDidMount() {
        const tag = findNodeHandle(this);
        const animation = this.props.animation;
        const config = {
            animation: animation,
            sv: this.sv,
        }
        runOnUI(() => {
            'worklet'
            LayoutAnimationRepository.registerConfig(tag, config);
        })();
    }

    render() {
        return (
            <REALayoutView {...this.props} animated={true && !(this.props.animated === 'false')} ref={this.ref} />
        );
    }

    componentWillUnmount() {
        const tag = findNodeHandle(this);
        this.sv = null;
        runOnUI(() => {
            'worklet'
            LayoutAnimationRepository.removeConfig(tag);
        })();
    }

}

/*

    <AnimatedRoot animation={withTiming(1)} >
    </AnimatedRoot>
*/