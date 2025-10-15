'use strict';
import React from 'react';

interface ComponentProps {
  children?: React.ReactNode;
}

const createComponent = function (name: string) {
  return class extends React.Component<ComponentProps> {
    static displayName = name;

    render() {
      return React.createElement(name, this.props, this.props.children);
    }

    setNativeProps(props: Record<string, any>) {
      this._props = { ...this._props, ...props };
    }

    _props: any;
  };
};

const Svg = createComponent('Svg');
const Path = createComponent('Path');
const Circle = createComponent('Circle');
const Rect = createComponent('Rect');
const G = createComponent('G');
const Line = createComponent('Line');
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
