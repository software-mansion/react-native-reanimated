import React from 'react';
import { createAnimatedAlways } from './AnimatedAlways';

class Code extends React.Component {
  componentDidMount() {
    this.always = createAnimatedAlways(
      this.props.exec ? this.props.exec : this.props.children()
    );
    this.always.__attach();
  }

  componentWillUnmount() {
    this.always.__detach();
  }

  render() {
    return null;
  }
}
export default Code;
