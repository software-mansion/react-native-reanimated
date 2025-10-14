'use strict';
import React from 'react';

const createComponent = function (name: string) {
  return class extends React.Component {
    static displayName = name;

    render() {
      // @ts-ignore to-do: it has problem with read-only
      // eslint-disable-next-line react/prop-types
      return React.createElement(name, this.props, this.props.children);
    }

    setNativeProps(props: any) {
      const { style } = props;
      // @ts-ignore to-do: it has problem with read-only
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
// @ts-ignore to-do: it has problem with duplicate
const Text = createComponent('Text');
const TSpan = createComponent('TSpan');
const TextPath = createComponent('TextPath');
const Defs = createComponent('Defs');
const Stop = createComponent('Stop');
const LinearGradient = createComponent('LinearGradient');
const RadialGradient = createComponent('RadialGradient');
const ClipPath = createComponent('ClipPath');
const Polygon = createComponent('Polygon');
const Polyline = createComponent('Polyline');
const Ellipse = createComponent('Ellipse');
const Use = createComponent('Use');
// @ts-ignore to-do: it has problem with duplicate
const Image = createComponent('Image');

const SVG = {
  Svg,
  Path,
  Circle,
  Rect,
  G,
  Line,
  Text,
  TSpan,
  TextPath,
  Defs,
  Stop,
  LinearGradient,
  RadialGradient,
  ClipPath,
  Polygon,
  Polyline,
  Ellipse,
  Use,
  Image,
};

module.exports = { __esModule: true, ...SVG };
