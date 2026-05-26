'use strict';
// React Native Web exports these untyped — keep `any` to mirror that shape so
// callers passing RN style objects don't have to narrow.
/* eslint-disable @typescript-eslint/no-explicit-any */

export let createReactDOMStyle: (style: any) => any;

export let createTransformValue: (transform: any) => any;

export let createTextShadowValue: (style: any) => void | string;
