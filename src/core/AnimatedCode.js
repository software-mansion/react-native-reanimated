import React from 'react';
import AnimatedAlways from './AnimatedAlways';
import deepEqual from 'fbjs/lib/areEqual';

class Code extends React.Component {
  
  constructor(props) {
    super(props);
    this.always = new AnimatedAlways(
      props.exec ? props.exec : props.children()
    );
  }
  
  componentDidMount() {
    this.always.__attach();
  }

  shouldComponentUpdate(props) {
    if (!deepEqual(props, this.props)) {
      // Firstly attach new alwaysNode in order to prevent reattaching of input nodes
      const newAlways = new AnimatedAlways(
        props.exec ? props.exec : props.children()
      );
      newAlways.__attach();
      this.always.__detach();
      this.always = newAlways;
    }
    return true;
  }

  componentWillUnmount() {
    this.always.__detach();
  }
  
  render() {
    return null;
  }
}
export default Code;
