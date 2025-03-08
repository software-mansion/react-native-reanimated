'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../../../../commonTypes';
import type {
  CSSAnimationUpdates,
  NormalizedCSSAnimationKeyframesConfig,
  NormalizedCSSTransitionConfig,
} from '../types';

export enum CSSUpdateType {
  SET_VIEW_STYLE = 'setViewStyle',
  REMOVE_VIEW_STYLE = 'removeViewStyle',
  REGISTER_KEYFRAMES = 'registerCSSKeyframes',
  UNREGISTER_KEYFRAMES = 'unregisterCSSKeyframes',
  APPLY_ANIMATIONS = 'applyCSSAnimations',
  UNREGISTER_ANIMATIONS = 'unregisterCSSAnimations',
  REGISTER_TRANSITION = 'registerCSSTransition',
  UPDATE_TRANSITION = 'updateCSSTransition',
  UNREGISTER_TRANSITION = 'unregisterCSSTransition',
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
