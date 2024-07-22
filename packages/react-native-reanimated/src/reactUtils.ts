import React from 'react';

export function isReactRendering() {
  // @ts-expect-error React secret internals aren't typed
  return !!React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner.current;
}
