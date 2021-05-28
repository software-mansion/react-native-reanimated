import React from 'react';
import { requireNativeComponent } from 'react-native';
export const NativeHeroView = requireNativeComponent('REAHeroView');

export class HeroView extends React.Component {
  render() {
    return <NativeHeroView {...this.props} />;
  }
}
