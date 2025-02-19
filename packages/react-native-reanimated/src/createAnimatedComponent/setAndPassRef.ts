'use strict';
/** Imported from react-native */

import type { MutableRefObject } from 'react';

/* eslint-disable */
/**
 * This is a helper function for when a component needs to be able to forward a
 * ref to a child component, but still needs to have access to that component as
 * part of its implementation.
 *
 * Its main use case is in wrappers for native components.
 *
 * Usage:
 *
 * Class MyView extends React.Component { _nativeRef = null;
 *
 *     _setNativeRef = setAndPassRef({
 *       getRef: () => this.props.ref,
 *       setLocalRef: ref => {
 *         this._nativeRef = ref;
 *       },
 *     });
 *
 *     render() {
 *       return <View ref={this._setNativeRef} />;
 *     }
 *
 * }
 *
 * Const MyViewWithRef = (props, ref) => ( <MyView {...props} ref={ref} /> );
 *
 * Module.exports = MyViewWithRef;
 */
/* eslint-enable */

// TODO: fix types and namign
type Ref<T> = () => MutableRefObject<T> | ((ref: T) => void);

function setAndPassRef<T>({
  getRef,
  setLocalRef,
}: {
  getRef: Ref<T>;
  setLocalRef: (ref: T) => void;
}): (ref: T) => void {
  return function ref(ref: T) {
    const reference = getRef();

    setLocalRef(ref);

    // Forward to user ref prop (if one has been specified)
    if (typeof reference === 'function') {
      // Handle function-based refs. String-based refs are handled as functions.
      reference(ref);
    } else if (typeof reference === 'object' && reference) {
      // Handle createRef-based refs
      reference.current = ref;
    }
  };
}

export default setAndPassRef;
