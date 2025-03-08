'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../../../../commonTypes';
import type {
  CSSAnimationUpdates,
  NormalizedCSSAnimationKeyframesConfig,
  NormalizedCSSTransitionConfig,
} from '../types';

export enum CSSUpdateType {
  SET_VIEW_STYLE = 'SET_VIEW_STYLE',
  REMOVE_VIEW_STYLE = 'REMOVE_VIEW_STYLE',
  REGISTER_KEYFRAMES = 'REGISTER_KEYFRAMES',
  UNREGISTER_KEYFRAMES = 'UNREGISTER_KEYFRAMES',
  APPLY_ANIMATIONS = 'APPLY_ANIMATIONS',
  UNREGISTER_ANIMATIONS = 'UNREGISTER_ANIMATIONS',
  REGISTER_TRANSITION = 'REGISTER_TRANSITION',
  UPDATE_TRANSITION = 'UPDATE_TRANSITION',
  UNREGISTER_TRANSITION = 'UNREGISTER_TRANSITION',
}

export interface PayloadTypes {
  [CSSUpdateType.SET_VIEW_STYLE]: {
    viewTag: number;
    style: StyleProps;
  };
  [CSSUpdateType.REMOVE_VIEW_STYLE]: {
    viewTag: number;
  };
  [CSSUpdateType.REGISTER_KEYFRAMES]: {
    animationName: string;
    keyframesConfig: NormalizedCSSAnimationKeyframesConfig;
  };
  [CSSUpdateType.UNREGISTER_KEYFRAMES]: {
    animationName: string;
  };
  [CSSUpdateType.APPLY_ANIMATIONS]: {
    shadowNodeWrapper: ShadowNodeWrapper;
    animationUpdates: CSSAnimationUpdates;
  };
  [CSSUpdateType.UNREGISTER_ANIMATIONS]: {
    viewTag: number;
  };
  [CSSUpdateType.REGISTER_TRANSITION]: {
    shadowNodeWrapper: ShadowNodeWrapper;
    transitionConfig: NormalizedCSSTransitionConfig;
  };
  [CSSUpdateType.UPDATE_TRANSITION]: {
    viewTag: number;
    configUpdates: Partial<NormalizedCSSTransitionConfig>;
  };
  [CSSUpdateType.UNREGISTER_TRANSITION]: {
    viewTag: number;
  };
}

export type CSSUpdate<T extends CSSUpdateType> = {
  type: T;
  payload: PayloadTypes[T];
};

export type AnyCSSUpdate = CSSUpdate<CSSUpdateType>;
