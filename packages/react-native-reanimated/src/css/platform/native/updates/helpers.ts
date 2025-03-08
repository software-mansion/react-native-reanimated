import type { ShadowNodeWrapper } from '../../../../commonTypes';
import type { PlainStyle } from '../../../types';
import type {
  CSSAnimationUpdates,
  NormalizedCSSAnimationKeyframesConfig,
  NormalizedCSSTransitionConfig,
} from '../types';
import type { CSSUpdate } from './types';
import { CSSUpdateType } from './types';

export const setViewStyleUpdate = (
  viewTag: number,
  style: PlainStyle
): CSSUpdate<CSSUpdateType.SET_VIEW_STYLE> => ({
  type: CSSUpdateType.SET_VIEW_STYLE,
  payload: {
    viewTag,
    style,
  },
});

export const removeViewStyleUpdate = (
  viewTag: number
): CSSUpdate<CSSUpdateType.REMOVE_VIEW_STYLE> => ({
  type: CSSUpdateType.REMOVE_VIEW_STYLE,
  payload: {
    viewTag,
  },
});

export const registerCSSKeyframesUpdate = (
  animationName: string,
  keyframesConfig: NormalizedCSSAnimationKeyframesConfig
): CSSUpdate<CSSUpdateType.REGISTER_KEYFRAMES> => ({
  type: CSSUpdateType.REGISTER_KEYFRAMES,
  payload: {
    animationName,
    keyframesConfig,
  },
});

export const unregisterCSSKeyframesUpdate = (
  animationName: string
): CSSUpdate<CSSUpdateType.UNREGISTER_KEYFRAMES> => ({
  type: CSSUpdateType.UNREGISTER_KEYFRAMES,
  payload: {
    animationName,
  },
});

export const applyCSSAnimationsUpdate = (
  shadowNodeWrapper: ShadowNodeWrapper,
  animationUpdates: CSSAnimationUpdates
): CSSUpdate<CSSUpdateType.APPLY_ANIMATIONS> => ({
  type: CSSUpdateType.APPLY_ANIMATIONS,
  payload: {
    shadowNodeWrapper,
    animationUpdates,
  },
});

export const unregisterCSSAnimationsUpdate = (
  viewTag: number
): CSSUpdate<CSSUpdateType.UNREGISTER_ANIMATIONS> => ({
  type: CSSUpdateType.UNREGISTER_ANIMATIONS,
  payload: {
    viewTag,
  },
});

export const registerCSSTransitionUpdate = (
  shadowNodeWrapper: ShadowNodeWrapper,
  transitionConfig: NormalizedCSSTransitionConfig
): CSSUpdate<CSSUpdateType.REGISTER_TRANSITION> => ({
  type: CSSUpdateType.REGISTER_TRANSITION,
  payload: {
    shadowNodeWrapper,
    transitionConfig,
  },
});

export const updateCSSTransitionUpdate = (
  viewTag: number,
  configUpdates: Partial<NormalizedCSSTransitionConfig>
): CSSUpdate<CSSUpdateType.UPDATE_TRANSITION> => ({
  type: CSSUpdateType.UPDATE_TRANSITION,
  payload: {
    viewTag,
    configUpdates,
  },
});

export const unregisterCSSTransitionUpdate = (
  viewTag: number
): CSSUpdate<CSSUpdateType.UNREGISTER_TRANSITION> => ({
  type: CSSUpdateType.UNREGISTER_TRANSITION,
  payload: {
    viewTag,
  },
});
