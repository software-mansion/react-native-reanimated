'use strict';

import { convertStringToNumber, processColorSVG, processOpacity, processStrokeDashArray } from "../processors/index.js";
const colorAttributes = {
  process: processColorSVG
};
const colorProps = {
  color: colorAttributes
};
const fillProps = {
  fill: colorAttributes,
  fillOpacity: {
    process: processOpacity
  },
  fillRule: {
    process: convertStringToNumber({
      evenodd: 0,
      nonzero: 1
    })
  }
};
const strokeProps = {
  stroke: colorAttributes,
  strokeWidth: true,
  strokeOpacity: {
    process: processOpacity
  },
  strokeDasharray: {
    process: processStrokeDashArray
  },
  strokeDashoffset: true,
  strokeLinecap: {
    process: convertStringToNumber({
      butt: 0,
      square: 2,
      round: 1
    })
  },
  strokeLinejoin: {
    process: convertStringToNumber({
      miter: 0,
      bevel: 2,
      round: 1
    })
  },
  strokeMiterlimit: true,
  vectorEffect: {
    process: convertStringToNumber({
      none: 0,
      default: 0,
      nonScalingStroke: 1,
      'non-scaling-stroke': 1,
      inherit: 2,
      uri: 3
    })
  }
};
const clipProps = {
  clipRule: true,
  clipPath: true // TODO - maybe preprocess this?
};
const transformProps = {
  translate: true,
  // TODO - add preprocessor (NumberArray) and split to translateX and translateY
  translateX: true,
  translateY: true,
  origin: true,
  // TODO - add preprocessor (NumberArray) and split to originX and originY
  originX: true,
  originY: true,
  scale: true,
  // TODO - add preprocessor (NumberArray) and split to scaleX and scaleY
  scaleX: true,
  scaleY: true,
  skew: true,
  // TODO - add preprocessor (NumberArray) and split to skewX and skewY
  skewX: true,
  skewY: true,
  rotation: true,
  x: true,
  y: true,
  transform: true // TODO - add preprocessor
};
const responderProps = {
  pointerEvents: true
};

// TODO - check what these props are doing and if we need to preprocess them
const commonMarkerProps = {
  marker: true,
  markerStart: true,
  markerMid: true,
  markerEnd: true
};
const commonMaskProps = {
  mask: true // TODO - add preprocessor
};
const commonFilterProps = {
  filter: true // TODO - add preprocessor
};
export const commonSvgProps = {
  ...colorProps,
  ...fillProps,
  ...strokeProps,
  ...clipProps,
  ...transformProps,
  ...responderProps,
  ...commonMarkerProps,
  ...commonMaskProps,
  ...commonFilterProps
};
//# sourceMappingURL=common.js.map