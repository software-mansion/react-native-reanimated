import React from 'react';
import { requireNativeComponent } from 'react-native';
export const NativeHeroView = requireNativeComponent('REAHeroView');

export class HeroView extends React.Component {
    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <NativeHeroView {...this.props} />
        );
    }

}