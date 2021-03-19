import { requireNativeComponent, findNodeHandle, unstable_enableLogBox } from 'react-native';
import React from 'react';
import { runOnUI, makeMutable } from '../core';
import { withTiming, withStyleAnimation } from '../animations';
import { OpacityAnimation, ReverseAnimation } from './defaultAnimations';

const REALayoutView = requireNativeComponent('REALayoutView');
export class AnimatedLayout extends React.Component {
    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <REALayoutView collapsable={false} {...this.props} animated={true && !(this.props.animated === 'false')} />
        );
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
                console.log("registered config for", tag);
            },
            removeConfig(tag) {
                delete configs[tag];
            },
            startAnimationForTag(tag, type, yogaValues) { 
                if (configs[tag] == null) {
                    return; // :(
                }

                console.log("animation will be started", tag, JSON.stringify(yogaValues));

                if (typeof configs[tag][type] != 'function') {
                    console.error(`${type} animation for a tag: ${tag} it not a function!`);
                }

                const style = configs[tag][type](yogaValues);
                console.log("animationObjectKeys", Object.keys(style));
                const sv = configs[tag].sv;
                _stopObservingProgress(tag, false);
                _startObservingProgress(tag, sv);
                sv._value = Object.assign({}, sv._value, style.initialValues);
                _stopObservingProgress(tag, false);
                const animation = withStyleAnimation(style.animations);

                animation.callback = (finished) => {
                    if (finished) {
                        _stopObservingProgress(tag, finished);
                    }
                }
                console.log("animation has been started", tag, JSON.stringify(yogaValues));
                configs[tag].sv.value = animation;
                _startObservingProgress(tag, sv);
            },
        };  
    }
)();