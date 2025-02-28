'use strict';
import type {
  ForwardRefExoticComponent,
  ForwardRefRenderFunction,
  PropsWithoutRef,
  RefAttributes,
} from 'react';
import React, { forwardRef } from 'react';

import { isReact19 } from './PlatformChecker';

const IS_REACT_19 = isReact19();

function getCurrentReactOwner() {
  return (
    // @ts-expect-error React secret internals aren't typed
    React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?.A?.getOwner() ||
    // @ts-expect-error React secret internals aren't typed
    React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentOwner
      ?.current ||
    // @ts-expect-error React secret internals aren't typed
    React.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
      ?.ReactCurrentOwner?.current
  );
}

export function isReactRendering() {
  return !!getCurrentReactOwner();
}

export function isFirstReactRender() {
  const currentOwner = getCurrentReactOwner();
  // alternate is not null only after the first render and stores all the
  // data from the previous component render
  return currentOwner && !currentOwner?.alternate;
}

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
