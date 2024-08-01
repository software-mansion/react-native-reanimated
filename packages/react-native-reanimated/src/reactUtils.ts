'use strict';
import React from 'react';

function getCurrentReactOwner() {
  const ReactSharedInternals =
    // @ts-expect-error React secret internals aren't typed
    React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED ||
    // @ts-expect-error React secret internals aren't typed
    React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  return ReactSharedInternals?.ReactCurrentOwner?.current;
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
