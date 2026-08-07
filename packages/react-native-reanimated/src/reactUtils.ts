'use strict';
import type { Ref, RefCallback } from 'react';
import React from 'react';

import type { Maybe } from './common';

export function assignRef<T>(
  ref: Maybe<Ref<T>>,
  instance: T | null
): (() => void) | undefined {
  if (typeof ref === 'function') {
    const cleanup: unknown = ref(instance);
    return typeof cleanup === 'function' ? (cleanup as () => void) : undefined;
  }
  if (ref) {
    ref.current = instance;
  }
  return undefined;
}

export function mergeRefs<T>(...refs: Maybe<Ref<T>>[]): RefCallback<T> {
  return (instance: T | null) => {
    const cleanups = refs.map(
      (ref) => assignRef(ref, instance) ?? (() => assignRef(ref, null))
    );

    return () => cleanups.forEach((cleanup) => cleanup());
  };
}

function getCurrentReactOwner() {
  return (
    // @ts-expect-error React secret internals aren't typed
    React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?.A?.getOwner?.() ||
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
