'use strict';
import type { StyleProps } from '../../../commonTypes';
import type { NativePseudoSelectorKey } from '../../types/pseudo';
import type { CSSTransitionConfig } from './transition';

export type CSSPseudoStyleEntry = {
  selector: NativePseudoSelectorKey;
  selectorStyle: StyleProps;
  transition: CSSTransitionConfig;
};

export type CSSPseudoStyleConfig = {
  defaultStyle: StyleProps;
  selectors: CSSPseudoStyleEntry[];
  // Whether the platform can show the view's routed transitions, see platformRouting.
  platformAllowed: boolean;
};
