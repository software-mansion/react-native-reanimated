import React from 'react';
import AnimatedAlways from './AnimatedAlways';

class Code extends React.Component {
  evaluateIfNeeded = node => (typeof node === 'function' ? node() : node);
  alwaysNodes = [];
  always = node => new AnimatedAlways(this.evaluateIfNeeded(node));
  componentDidMount() {
    const nodes = this.evaluateIfNeeded(
      this.props.exec ? this.props.exec : this.props.children
    );
    this.alwaysNodes = Array.isArray(nodes)
      ? nodes.map(this.always)
      : [this.always(nodes)];
    this.alwaysNodes.forEach(n => n.__attach);
  }

  componentWillUnmount() {
    this.alwaysNodes.forEach(n => n.__detach());
  }

  render() {
    return null;
  }
}
export default Code;
