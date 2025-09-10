import type { ShadowNodeWrapper, StyleProps } from '../../commonTypes';
import type { CSSAnimationUpdates, NormalizedCSSAnimationKeyframesConfig, NormalizedCSSTransitionConfig } from './types';
export declare function setViewStyle(viewTag: number, style: StyleProps): void;
export declare function markNodeAsRemovable(shadowNodeWrapper: ShadowNodeWrapper): void;
export declare function unmarkNodeAsRemovable(viewTag: number): void;
export declare function registerCSSKeyframes(animationName: string, viewName: string, keyframesConfig: NormalizedCSSAnimationKeyframesConfig): void;
export declare function unregisterCSSKeyframes(animationName: string, viewName: string): void;
export declare function applyCSSAnimations(shadowNodeWrapper: ShadowNodeWrapper, animationUpdates: CSSAnimationUpdates): void;
export declare function unregisterCSSAnimations(viewTag: number): void;
export declare function registerCSSTransition(shadowNodeWrapper: ShadowNodeWrapper, transitionConfig: NormalizedCSSTransitionConfig): void;
export declare function updateCSSTransition(viewTag: number, configUpdates: Partial<NormalizedCSSTransitionConfig>): void;
export declare function unregisterCSSTransition(viewTag: number): void;
//# sourceMappingURL=proxy.d.ts.map