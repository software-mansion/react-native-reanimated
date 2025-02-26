'use strict';
import type { CSSStyle } from '../types';

export type CSSManagerInterface = {
  attach(style: CSSStyle): void;
  update(style: CSSStyle, isMount?: boolean): void;
  detach(): void;
};
