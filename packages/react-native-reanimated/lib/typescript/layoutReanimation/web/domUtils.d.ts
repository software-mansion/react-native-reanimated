/**
 * Creates `HTMLStyleElement`, inserts it into DOM and then inserts CSS rules
 * into the stylesheet. If style element already exists, nothing happens.
 */
export declare function configureWebLayoutAnimations(): void;
export declare function insertWebAnimation(animationName: string, keyframe: string): void;
export declare function scheduleAnimationCleanup(animationName: string, animationDuration: number, animationRemoveCallback: () => void): void;
export declare function addHTMLMutationObserver(): void;
export declare function areDOMRectsEqual(r1: DOMRect, r2: DOMRect): boolean;
//# sourceMappingURL=domUtils.d.ts.map