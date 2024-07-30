'use strict';
import React from 'react';

function getCurrentReactOwner() {
  // @ts-expect-error React secret internals aren't typed
  return React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    .ReactCurrentOwner.current;
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
