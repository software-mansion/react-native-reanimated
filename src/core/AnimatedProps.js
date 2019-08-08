import { findNodeHandle, StyleSheet } from 'react-native';

import AnimatedNode from './AnimatedNode';
import AnimatedEvent from './AnimatedEvent';
import { createOrReuseTransformNode } from './AnimatedTransform';

import invariant from 'fbjs/lib/invariant';
import deepEqual from 'fbjs/lib/areEqual';

function sanitizeProps(inputProps) {
  const props = {};
  for (const key in inputProps) {
    const value = inputProps[key];
    if (value instanceof AnimatedNode && !(value instanceof AnimatedEvent)) {
      props[key] = value.__nodeID;
    }
  }
  return props;
}

export function createOrReusePropsNode(props, callback, oldNode) {
  if (props.style) {
    let { style, ...rest } = props;
    style = StyleSheet.flatten(style) || {};
    if (style.transform) {
      style = {
        ...style,
        transform: createOrReuseTransformNode(
          style.transform,
          oldNode && oldNode._props.transform
        ),
      };
    }
    props = {
      ...rest,
      ...style,
    };
  }
  const config = sanitizeProps(props);
  if (oldNode && deepEqual(config, oldNode._config)) {
    return oldNode;
  }
  return new AnimatedProps(props, config, callback);
}

class AnimatedProps extends AnimatedNode {
  constructor(props, config, callback) {
    super(
      { type: 'props', props: config },
      Object.values(props).filter(n => !(n instanceof AnimatedEvent))
    );
    this._config = config;
    this._props = props;
    this._callback = callback;
    this.__attach();
  }

  _walkPropsAndGetAnimatedValues(props) {
    const updatedProps = {};
    for (const key in props) {
      const value = props[key];
      if (value instanceof AnimatedNode) {
        updatedProps[key] = value.__getValue();
      } else if (value && !Array.isArray(value) && typeof value === 'object') {
        // Support animating nested values (for example: shadowOffset.height)
        updatedProps[key] = this._walkPropsAndGetAnimatedValues(value);
      }
    }
    return updatedProps;
  }

  __onEvaluate() {
    return this._walkPropsAndGetAnimatedValues(this._props);
  }

  __detach() {
    const nativeViewTag = findNodeHandle(this._animatedView);
    invariant(
      nativeViewTag != null,
      'Unable to locate attached view in the native tree'
    );
    this._disconnectAnimatedView(nativeViewTag);
    super.__detach();
  }

  update() {
    this._callback();
  }

  setNativeView(animatedView) {
    if (this._animatedView === animatedView) {
      return;
    }
    this._animatedView = animatedView;

    const nativeViewTag = findNodeHandle(this._animatedView);
    invariant(
      nativeViewTag != null,
      'Unable to locate attached view in the native tree'
    );
    this._connectAnimatedView(nativeViewTag);
  }
}
