import type {
  ForwardRefExoticComponent,
  ForwardRefRenderFunction,
  PropsWithoutRef,
  RefAttributes,
} from 'react';
import React, { forwardRef } from 'react';

export function isReact19() {
  return React.version.startsWith('19.');
}

const IS_REACT_19 = isReact19();

// This is an adjusted version of https://github.com/adobe/react-spectrum/issues/7494#issuecomment-2546940052
// eslint-disable-next-line @typescript-eslint/ban-types
export function componentWithRef<T, P = {}>(
  render: ForwardRefRenderFunction<T, P>
): ForwardRefExoticComponent<P & RefAttributes<T>> {
  if (IS_REACT_19) {
    return (({ ref, ...props }) =>
      render(
        props as P,
        ref as React.ForwardedRef<T>
      )) as ForwardRefExoticComponent<P & RefAttributes<T>>;
  }

  return forwardRef(
    render as ForwardRefRenderFunction<T, PropsWithoutRef<P>>
  ) as ForwardRefExoticComponent<P & RefAttributes<T>>;
}
