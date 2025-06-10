'use strict';
type AllowlistsHolder = {
  UI_THREAD_PROPS_WHITELIST: Record<string, boolean>;
  NATIVE_THREAD_PROPS_WHITELIST: Record<string, boolean>;
};

export const PropsAllowlists: AllowlistsHolder = {
  /** Styles allowed to be direcly updated in UI thread */
  UI_THREAD_PROPS_WHITELIST: {
    // Nothing here
  },
  /**
   * Whitelist of view props that can be updated in native thread via
   * UIManagerModule
   */
  NATIVE_THREAD_PROPS_WHITELIST: {
    // Nothing here
  },
};
