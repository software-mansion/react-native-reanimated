'use strict';

export let createReactDOMStyle:
  | ((
      style: Record<string, unknown>,
      writingDirection?: 'ltr' | 'rtl'
    ) => Record<string, unknown>)
  | undefined;
