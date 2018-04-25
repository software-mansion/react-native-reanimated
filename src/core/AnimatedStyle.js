import { StyleSheet } from 'react-native';

import AnimatedNode from './AnimatedNode';
import AnimatedTransform from './AnimatedTransform';

function sanitizeStyle(inputStyle) {
  const style = {};
  for (const key in inputStyle) {
    const value = inputStyle[key];
    if (value instanceof AnimatedNode) {
      style[key] = value.__nodeID;
    }
  }
  return style;
}

export default class AnimatedStyle extends AnimatedNode {
  constructor(style) {
    style = StyleSheet.flatten(style) || {};
    if (style.transform) {
      style = {
        ...style,
        transform: new AnimatedTransform(style.transform),
      };
    }
    super({ type: 'style', style: sanitizeStyle(style) }, Object.values(style));
    this._style = style;
  }

  // Recursively get values for nested styles (like iOS's shadowOffset)
  _walkStyleAndGetValues(style) {
    const updatedStyle = {};
    for (const key in style) {
      const value = style[key];
      if (value instanceof AnimatedNode) {
        // do nothing
      } else if (value && !Array.isArray(value) && typeof value === 'object') {
        // Support animating nested values (for example: shadowOffset.height)
        updatedStyle[key] = this._walkStyleAndGetValues(value);
      } else {
        updatedStyle[key] = value;
      }
    }
    return updatedStyle;
  }

  __getProps() {
    return this._walkStyleAndGetValues(this._style);
  }

  _walkStyleAndGetAnimatedValues(style) {
    const updatedStyle = {};
    for (const key in style) {
      const value = style[key];
      if (value instanceof AnimatedNode) {
        updatedStyle[key] = value.__getValue();
      } else if (value && !Array.isArray(value) && typeof value === 'object') {
        // Support animating nested values (for example: shadowOffset.height)
        updatedStyle[key] = this._walkStyleAndGetAnimatedValues(value);
      }
    }
    return updatedStyle;
  }

  __onEvaluate() {
    return this._walkStyleAndGetAnimatedValues(this._style);
  }
}
