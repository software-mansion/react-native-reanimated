'use strict';
import type { StyleProps } from '../../../commonTypes';
import type { PseudoSelectorKey } from '../../types/pseudo';
import type { CSSTransitionConfig } from './transition';

export type CSSPseudoStyleConfig = {
  selector: PseudoSelectorKey;
  selectorStyle: StyleProps;
  defaultStyle: StyleProps;
  transition: CSSTransitionConfig;
};
