'use strict';

/**
 * This variable has to be an object, because it can't be changed for the
 * worklets if it's a primitive value. We also have to bind it to a separate
 * object to prevent from freezing it in development.
 */
export const IN_STYLE_UPDATER = { current: false };
