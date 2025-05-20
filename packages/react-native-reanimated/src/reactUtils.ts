'use strict';
import React from 'react';

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
