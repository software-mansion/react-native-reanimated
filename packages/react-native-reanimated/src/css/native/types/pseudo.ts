'use strict';
import type { UnknownRecord } from '../../../common';
import type { StyleProps } from '../../../commonTypes';
import type { NativePseudoSelectorKey } from '../../types/pseudo';
import type { CSSTransitionConfig } from './transition';

export type PseudoStyleInput = {
  selector: NativePseudoSelectorKey;
  group?: number | undefined;
  selectorStyle: UnknownRecord;
};

export type PseudoStylesInput = {
  defaultStyle: UnknownRecord;
  selectors: readonly PseudoStyleInput[];
  hostsGroup?: number | undefined;
};

export type CSSPseudoStyleEntry = {
  selector: NativePseudoSelectorKey;
  group?: number;
  selectorStyle: StyleProps;
  transition: CSSTransitionConfig;
};

export type CSSPseudoStyleConfig = {
  defaultStyle: StyleProps;
  selectors: CSSPseudoStyleEntry[];
  hostsGroup?: number;
};
