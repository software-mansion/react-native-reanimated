import { Platform, requireNativeComponent } from 'react-native';
import React from 'react';

let REALayoutView: any;
if (Platform.OS === 'web' && !requireNativeComponent) {
  REALayoutView = React.Component;
} else {
  REALayoutView = (requireNativeComponent(
    'REALayoutView'
  ) as unknown) as React.Component;
}

export class AnimatedLayout extends React.Component {
  render(): React.ReactElement {
    return <REALayoutView collapsable={false} {...this.props} />;
  }
}
