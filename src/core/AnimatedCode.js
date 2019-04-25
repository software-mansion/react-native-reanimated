import React from 'react';
import { createAnimatedAlways } from './AnimatedAlways';
import AnimatedNode from './AnimatedNode';

class Code extends React.Component {
  static resolveNode = maybeNode => {
    if (typeof maybeNode === 'function') {
      return Code.resolveNode(maybeNode());
    }

    if (maybeNode instanceof AnimatedNode) {
      return maybeNode;
    }

    return null;
  };

  componentDidMount() {
    const { children, exec } = this.props;
    const nodeChildren = Code.resolveNode(children);
    const nodeExec = Code.resolveNode(exec);

    const cantResolveNode = nodeChildren === null && nodeExec === null;

    if (cantResolveNode) {
      const error =
        nodeChildren === null
          ? `Got "${typeof children}" type passed to children`
          : `Got "${typeof exec}" type passed to exec`;

      throw new Error(
        `<Animated.Code /> expects the 'exec' prop or children to be an animated node or a function returning an animated node. ${error}`
      );
    }

    this.always = createAnimatedAlways(nodeExec || nodeChildren);
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
