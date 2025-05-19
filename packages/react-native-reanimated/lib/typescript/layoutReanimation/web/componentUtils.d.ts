import { LayoutAnimationType } from '../../commonTypes';
import type { ReanimatedHTMLElement } from '../../ReanimatedModule/js-reanimated';
import type { TransitionData } from './animationParser';
import type { AnimationConfig, CustomConfig } from './config';
export declare function getReducedMotionFromConfig(config: CustomConfig): boolean;
export declare function getProcessedConfig(animationName: string, animationType: LayoutAnimationType, config: CustomConfig): AnimationConfig;
export declare function maybeModifyStyleForKeyframe(element: HTMLElement, config: CustomConfig): void;
export declare function saveSnapshot(element: HTMLElement): void;
export declare function setElementAnimation(element: ReanimatedHTMLElement, animationConfig: AnimationConfig, shouldSavePosition?: boolean, parent?: Element | null): void;
export declare function handleLayoutTransition(element: ReanimatedHTMLElement, animationConfig: AnimationConfig, transitionData: TransitionData): void;
export declare function handleExitingAnimation(element: HTMLElement, animationConfig: AnimationConfig): void;
//# sourceMappingURL=componentUtils.d.ts.map