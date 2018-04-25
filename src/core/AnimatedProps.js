import { findNodeHandle } from 'react-native';

import AnimatedNode from './AnimatedNode';
import AnimatedStyle from './AnimatedStyle';
import AnimatedEvent from './AnimatedEvent';

import invariant from 'fbjs/lib/invariant';

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

export default class AnimatedProps extends AnimatedNode {
  constructor(props, callback) {
    if (props.style) {
      props = { ...props, style: new AnimatedStyle(props.style) };
    }
    const nonEventProps = sanitizeProps(props);
    super(
      { type: 'props', props: nonEventProps },
      Object.values(props).filter(n => !(n instanceof AnimatedEvent))
    );
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
