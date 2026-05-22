'use strict';
import type { StyleProps } from '../../../commonTypes';
import type { NativePseudoSelectorKey } from '../../types/pseudo';
import type { CSSTransitionConfig } from './transition';

export type CSSPseudoStyleConfig = {
  selector: NativePseudoSelectorKey;
  selectorStyle: StyleProps;
  defaultStyle: StyleProps;
  transition: CSSTransitionConfig;
};
