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

// Register LayoutAnimationRepository

runOnUI(
    () => {
        'worklet';

        const configs = {};

        global.LayoutAnimationRepository = {
            configs,
            registerConfig(tag, config) {
                configs[tag] = config;
            },
            removeConfig(tag) {
                configs[tag].sv.value = 0;
                delete configs[tag];
            },
            startAnimationForTag(tag) { //TODO use previous animation values like velocity
                if (typeof configs[tag].animation != 'function') {
                    console.error(`Animation for a tag: ${tag} it not a function!`);
                }
                const animation = (configs[tag].animation)(); // it should be an animation factory as it has been created on RN side
                animation.callback = (finished) => {
                    if (finished) {
                        sv.value = 0;
                        _stopObservingProgress(tag);
                    }
                }
                _startObservingProgress(tag, sv);
                sv.value = animation;
                
            },
        };  
    }
)();

/*

    <AnimatedRoot animation={withTiming(1)} >
    </AnimatedRoot>
*/