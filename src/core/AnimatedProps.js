import { findNodeHandle } from 'react-native';

import AnimatedNode from './AnimatedNode';
import AnimatedEvent from './AnimatedEvent';
import AnimatedStyle, { createOrReuseStyleNode } from './AnimatedStyle';

import invariant from 'fbjs/lib/invariant';
import deepEqual from 'fbjs/lib/areEqual';

function sanitizeProps(inputProps) {
  const sanitized = {};
  const notSanitized = {};
  for (const key in inputProps) {
    const value = inputProps[key];
    if (value instanceof AnimatedNode && !(value instanceof AnimatedEvent)) {
      sanitized[key] = value.__nodeID;
    } else {
      notSanitized[key] = value;
    }
  }
  return { sanitized, notSanitized };
}

export function createOrReusePropsNode(props, callback, oldNode) {
  if (props.style) {
    props = {
      ...props,
      style: createOrReuseStyleNode(
        props.style,
        oldNode && oldNode._props.style
      ),
    };
  }
  const { sanitized: config, notSanitized } = sanitizeProps(props);
  if (
    oldNode &&
    deepEqual(config, oldNode._config) &&
    deepEqual(notSanitized, oldNode._notSanitizedProps)
  ) {
    return oldNode;
  }
  return new AnimatedProps(props, config, callback, notSanitized);
}

class AnimatedProps extends AnimatedNode {
  constructor(props, config, callback, notSanitizedProps) {
    super(
      { type: 'props', props: config },
      Object.values(props).filter(n => !(n instanceof AnimatedEvent))
    );
    this._notSanitizedProps = notSanitizedProps;
    this._config = config;
    this._props = props;
    this._callback = callback;
    this.__attach();
  }

  __getProps() {
    const props = {};
    for (const key in this._props) {
      const value = this._props[key];
      if (value instanceof AnimatedNode) {
        if (value instanceof AnimatedStyle) {
          props[key] = value.__getProps();
        }
      } else {
        props[key] = value;
      }
    }
    return props;
  }

  __onEvaluate() {
    const props = {};
    for (const key in this._props) {
      const value = this._props[key];
      if (value instanceof AnimatedNode) {
        props[key] = value.__getValue();
      }
    }
    return props;
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
