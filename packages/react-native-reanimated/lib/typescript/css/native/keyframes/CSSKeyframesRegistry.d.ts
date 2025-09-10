import type CSSKeyframesRuleImpl from './CSSKeyframesRuleImpl';
/**
 * This class is responsible for managing the registry of CSS animation
 * keyframes. It keeps track of views that use specific animations and handles
 * native-side registration. Animation keyframes are registered on the native
 * side only when used for the first time and unregistered when removed from the
 * last view that uses them.
 */
declare class CSSKeyframesRegistry {
    private readonly cssTextToNameMap_;
    private readonly nameToKeyframes_;
    get(nameOrCssText: string): CSSKeyframesRuleImpl<import("../../types").PlainStyle> | undefined;
    add(keyframesRule: CSSKeyframesRuleImpl, viewName: string, viewTag: number): void;
    remove(animationName: string, viewName: string, viewTag: number): void;
    clear(): void;
}
declare const cssKeyframesRegistry: CSSKeyframesRegistry;
export default cssKeyframesRegistry;
//# sourceMappingURL=CSSKeyframesRegistry.d.ts.map