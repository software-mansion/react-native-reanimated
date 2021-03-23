import { requireNativeComponent, findNodeHandle } from 'react-native';
import React from 'react';

const REALayoutView = requireNativeComponent('REALayoutView');

export class AnimatedRoot extends React.Component {
    constructor() {
        super();
    }

    componentDidUpdate() {
        const tag = findNodeHandle(this);
        const animation = this.props.animation;
        const config = {
            animation: animation
        }
        // NativeReanimated.registeConfig(tag, config);
    }

    render() {
        return (
            <REALayoutView {...this.props} animated={true && !(this.props.animated === 'false')} ref={this.ref} />
        );
    }

    componentWillUnmount() {
        const tag = findNodeHandle(this);
        // NativeReanimated.removeConfig(tag);
    }

}

/*

    <AnimatedRoot animation={withTiming(1)} >
    </AnimatedRoot>
*/