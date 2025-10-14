const React = require('react');

const createComponent = function (name) {
  return class extends React.Component {
    static displayName = name;

    render() {
      return React.createElement(name, this.props, this.props.children);
    }

    setNativeProps(props) {
      const { style } = props;
      this.props = { ...this.props, ...style };
    }
  };
};

const Svg = createComponent('Svg');
const Path = createComponent('Path');
const Circle = createComponent('Circle');
const Rect = createComponent('Rect');
const G = createComponent('G');
const Line = createComponent('Line');

module.exports = { Svg, Path, Circle, Rect, G, Line };
