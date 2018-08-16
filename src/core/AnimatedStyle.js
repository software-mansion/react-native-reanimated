import { StyleSheet } from 'react-native';

import AnimatedNode from './AnimatedNode';
import { createOrReuseTransformNode } from './AnimatedTransform';

import deepEqual from 'fbjs/lib/areEqual';

function sanitizeStyle(inputStyle) {
  const sanitized = {};
  const notSanitized = {};
  for (const key in inputStyle) {
    const value = inputStyle[key];
    if (value instanceof AnimatedNode) {
      sanitized[key] = value.__nodeID;
    } else {
      notSanitized[key] = value;
    }
  }
  return { sanitized, notSanitized };
}

export function createOrReuseStyleNode(style, oldNode) {
  style = StyleSheet.flatten(style) || {};
  if (style.transform) {
    style = {
      ...style,
      transform: createOrReuseTransformNode(
        style.transform,
        oldNode && oldNode._style.transform
      ),
    };
  }
  const { sanitized: config, notSanitized } = sanitizeStyle(style);

  if (
    oldNode &&
    deepEqual(config, oldNode._config) &&
    deepEqual(notSanitized, oldNode._notSanitizedStyle)
  ) {
    return oldNode;
  }
  return new AnimatedStyle(style, config, notSanitized);
}

/**
 * AnimatedStyle should never be directly instantiated, use createOrReuseStyleNode
 * in order to make a new instance of this node.
 */
export default class AnimatedStyle extends AnimatedNode {
  constructor(style, config, notSanitizedStyle) {
    super({ type: 'style', style: config }, Object.values(style));
    this._config = config;
    this._style = style;
    this._notSanitizedStyle = notSanitizedStyle;
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
