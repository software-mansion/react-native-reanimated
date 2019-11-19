import { findNodeHandle, Platform } from 'react-native';
import ReanimatedModule from '../ReanimatedModule';
import { val } from '../val';
import { adapt } from './AnimatedBlock';
import { createAnimatedMap } from './AnimatedMap';
import AnimatedNode from './AnimatedNode';
import invariant from 'fbjs/lib/invariant';

class AnimatedInvoke extends AnimatedNode {
  constructor(invokeConfig, ...params) {
    if (Platform.OS !== 'android') {
      throw new Error('Currently experimental direct manipulation are available only on Android');
    }
    super(
      {
        type: 'invoke',
        ...invokeConfig,
        params: params.map(n => n.__nodeID),
      },
      params
    );

    this.__attach();
  }

  __onEvaluate() {
    return val(this);
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

  __detach() {
    if (this._animatedView) {
      const nativeViewTag = findNodeHandle(this._animatedView);
      invariant(
        nativeViewTag != null,
        'Unable to locate attached view in the native tree'
      );
      this._disconnectAnimatedView(nativeViewTag);
      this._animatedView = null;
    }

    super.__detach();
  }
}

function createAnimatedInvokeBase(config, ...params) {
  const inputNodes = params.map((value) => {
    if (typeof value === 'object' && value instanceof AnimatedNode === false) {
      return createAnimatedMap(value);
    }
    else {
      return adapt(value);
    }
  });

  return new AnimatedInvoke(config, ...inputNodes);
}

export function createAnimatedInvoke(module, method, ...params) {
  return createAnimatedInvokeBase({ module, method }, ...params);
}

export function createAnimatedDispatch(module, command, ...params) {
  return createAnimatedInvokeBase({ module, command }, ...params);
}

export function getDevUtil() {
  return ReanimatedModule.getDevUtil();
}
